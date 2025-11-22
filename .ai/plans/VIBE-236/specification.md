# VIBE-236: CaTH General Information - Accessibility Statement

## Overview

Create a comprehensive accessibility statement page for the CaTH (Courts and Tribunals Hearings) service that complies with the Public Sector Bodies (Websites and Mobile Applications) (No. 2) Accessibility Regulations 2018 and follows GOV.UK Design System patterns.

## Requirements

### Legal Requirements
- Comply with Public Sector Bodies (Websites and Mobile Applications) (No. 2) Accessibility Regulations 2018
- Meet WCAG 2.2 AA standards
- Provide clear information about accessibility status, known issues, and reporting mechanisms
- Include required legal statements about enforcement procedures

### User Needs
As a user of the CaTH service, I need to:
- Understand what accessibility features are available
- Know how to report accessibility problems
- Find contact information for requesting alternative formats
- Learn about my rights regarding accessibility
- Access this information in both English and Welsh

### Content Requirements

The accessibility statement must include:

1. **Introduction Section**
   - Service scope statement
   - Commitment to accessibility
   - List of accessibility features (keyboard navigation, screen readers, zoom, etc.)
   - Link to AbilityNet for device accessibility advice

2. **Accessibility Status**
   - Clear statement of compliance level
   - Known accessibility issues with WCAG references
   - Current limitations and planned fixes

3. **Feedback and Contact Information**
   - How to request alternative formats (PDF, large print, audio, braille)
   - Contact details (email, phone, hours)
   - Expected response times

4. **Reporting Problems**
   - Instructions for reporting accessibility issues
   - Contact details for accessibility team

5. **Enforcement Procedure**
   - Information about EHRC (Equality and Human Rights Commission)
   - Details about EASS (Equality Advisory and Support Service)

6. **Technical Information**
   - Formal compliance statement
   - WCAG version and level
   - Non-compliance details with specific WCAG criteria references

7. **Non-Accessible Content**
   - List of non-compliant content
   - WCAG success criteria failures
   - PDF and document accessibility status
   - Disproportionate burden claims (if any)

8. **Testing Information**
   - When the statement was prepared
   - When the site was last tested
   - Who conducted the testing
   - What was tested

### Technical Requirements

#### Frontend
- Must be accessible from footer navigation on all pages
- Template must use GOV.UK Design System components
- Must support both English and Welsh languages
- Must work without JavaScript (progressive enhancement)
- Must be responsive and mobile-first
- Must meet WCAG 2.2 AA compliance:
  - Proper heading hierarchy (h1 → h2 → h3)
  - Semantic HTML structure
  - Sufficient color contrast
  - Keyboard navigation support
  - Screen reader compatibility

#### Implementation Pattern
- Location: `libs/web-core/src/pages/accessibility-statement/`
- Controller: `index.ts` with GET handler
- Template: `index.njk` extending base-template.njk
- Content: Separate `en.ts` and `cy.ts` locale files
- Route: `/accessibility-statement`

#### Testing Requirements
- Unit tests for controller
- Unit tests for template existence
- Unit tests for locale consistency
- E2E tests for page accessibility
- E2E tests for Welsh language support
- E2E tests for footer navigation link

## Acceptance Criteria

### Functional Criteria
- [ ] Accessibility statement page is accessible at `/accessibility-statement`
- [ ] Page is linked from the footer on all pages
- [ ] Page content matches GOV.UK accessibility statement pattern
- [ ] All required sections are present and complete
- [ ] Contact information is accurate and up-to-date
- [ ] Welsh translation is complete and accurate
- [ ] Page works without JavaScript

### Technical Criteria
- [ ] Template uses GOV.UK Design System components
- [ ] Content is structured with proper semantic HTML
- [ ] Heading hierarchy is correct (h1 → h2 → h3)
- [ ] All links are functional
- [ ] External links open in same window (GOV.UK pattern)
- [ ] Page is responsive across all breakpoints (320px+)

### Accessibility Criteria
- [ ] WCAG 2.2 AA compliant
- [ ] Proper heading structure validated
- [ ] Color contrast meets AA standards (4.5:1 for normal text)
- [ ] Screen reader compatibility verified
- [ ] Keyboard navigation functional
- [ ] Focus indicators visible
- [ ] Alt text provided for any images
- [ ] Language attributes set correctly (lang="en" / lang="cy")

### Testing Criteria
- [ ] Unit tests pass for controller
- [ ] Unit tests pass for template
- [ ] Unit tests pass for locale consistency
- [ ] E2E tests pass for page rendering
- [ ] E2E tests pass for Welsh translation
- [ ] E2E tests pass for accessibility validation
- [ ] Manual testing with screen reader completed
- [ ] Manual testing with keyboard only completed

## Content Updates Required

The following content must be reviewed and updated to reflect the actual CaTH service:

1. **Service-Specific Information**
   - Update testing dates to reflect actual testing
   - Update contact details to CaTH-specific contacts
   - Review and update known accessibility issues

2. **Testing History**
   - Preparation date of statement
   - Last review date
   - Last testing date
   - Testing organization details

3. **Known Issues**
   - Replace generic issues with CaTH-specific findings
   - Include specific WCAG 2.2 criterion references
   - Document any service-specific limitations

4. **Contact Information**
   - Verify email addresses are correct
   - Verify phone numbers are correct
   - Verify operating hours are accurate

## Dependencies

- GOV.UK Frontend (v5.2.0+)
- Nunjucks template engine
- i18n middleware for Welsh support
- web-core module for base templates and components

## Out of Scope

- Actual accessibility testing of the service (separate activity)
- Fixing accessibility issues found (tracked separately)
- Creating alternative format versions of content
- Setting up accessibility testing infrastructure
- Automated accessibility monitoring

## References

- [GOV.UK Accessibility Statement Pattern](https://design-system.service.gov.uk/patterns/accessibility-statement/)
- [Understanding WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/)
- [Public Sector Bodies Accessibility Regulations 2018](https://www.legislation.gov.uk/uksi/2018/952/contents/made)
- [HMCTS Design Patterns](https://hmcts-design-system.herokuapp.com/)

## Success Metrics

- Accessibility statement is findable by 100% of users seeking it
- Zero errors in automated accessibility testing (axe-core)
- Positive feedback from accessibility auditors
- Welsh translation accuracy verified by Welsh speaker
- Zero WCAG 2.2 AA violations on the statement page itself
