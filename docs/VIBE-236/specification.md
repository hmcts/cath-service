# VIBE-236: CaTH General Information - Accessibility Statement

## Technical Specification

### 1. Overview

This specification outlines the implementation requirements for updating the CaTH (Court and Tribunal Hearings) service's accessibility statement to meet current WCAG 2.2 AA standards and GOV.UK Design System patterns.

### 2. Current State Analysis

#### Existing Implementation
The codebase already contains:
- Accessibility statement page at `libs/web-core/src/pages/accessibility-statement/`
- Controller: `index.ts`
- English content: `en.ts`
- Welsh content: `cy.ts`
- Template: `index.njk`
- Footer link in `libs/web-core/src/views/components/site-footer.njk`
- Back-to-top JavaScript component at `libs/web-core/src/assets/js/back-to-top.ts`

#### Current Route Structure
- English: `/accessibility-statement`
- Welsh: Currently follows same route with language parameter

#### Current Footer Implementation
The footer includes an accessibility link at line 19-22 of `site-footer.njk`:
```nunjucks
{
  href: "/accessibility-statement",
  text: footer.accessibility
}
```

### 3. Requirements Analysis

#### 3.1 Footer Link Requirements
- **Requirement**: Add accessibility statement link to footer that opens in a new window
- **Current State**: Link exists but does NOT open in new window
- **Gap**: Need to add `target="_blank"` and appropriate `rel` attributes
- **Accessibility Consideration**: Must include visually hidden text indicating link opens in new window

#### 3.2 Page Content Requirements
- **Requirement**: Update accessibility statement content from provided DOCX
- **Current State**: Generic HMCTS accessibility statement content exists
- **Gap**: Content needs to be updated to be specific to CaTH service
- **Note**: Without ability to read the DOCX file directly, implementation will need to work with stakeholders to extract content

#### 3.3 Welsh URL Requirements
- **Requirement**: Welsh accessibility statement should be at `/datganiad-hygyrchedd`
- **Current State**: Uses same URL with language parameter
- **Gap**: Need to implement Welsh-specific route
- **Technical Approach**: Create separate page controller for Welsh route that shares content

#### 3.4 Back to Top Feature
- **Requirement**: "Back to Top" link at bottom of accessibility statement page
- **Current State**: JavaScript component exists but not integrated into accessibility statement page
- **Gap**: Need to add back-to-top link to the template

### 4. Technical Design

#### 4.1 URL Structure

**English Route**: `/accessibility-statement`
- File: `libs/web-core/src/pages/accessibility-statement/index.ts`
- Template: `libs/web-core/src/pages/accessibility-statement/index.njk`

**Welsh Route**: `/datganiad-hygyrchedd`
- File: `libs/web-core/src/pages/datganiad-hygyrchedd.ts` (new)
- Template: Reuses `libs/web-core/src/pages/accessibility-statement/index.njk`
- Controller: Imports and renders same content as English version

#### 4.2 Footer Link Implementation

**GOV.UK Footer Macro Enhancement**
The GOV.UK footer macro supports additional attributes via the `attributes` property:

```nunjucks
{
  href: "/accessibility-statement",
  text: footer.accessibility,
  attributes: {
    target: "_blank",
    rel: "noopener noreferrer"
  }
}
```

**Accessibility Enhancement**
Add visually hidden text to indicate new window:
```typescript
// In locales/en.ts
accessibility: "Accessibility statement (opens in new tab)"

// In locales/cy.ts
accessibility: "Datganiad hygyrchedd (yn agor mewn tab newydd)"
```

#### 4.3 Back to Top Implementation

**Template Addition** (`index.njk`)
Add after main content, before closing content block:

```nunjucks
<div class="govuk-!-margin-top-8">
  <a href="#" class="govuk-link back-to-top-link">{{ backToTop }}</a>
</div>
```

**Content Strings**
```typescript
// en.ts
backToTop: "Back to top"

// cy.ts
backToTop: "Yn ôl i'r brig"
```

**JavaScript Initialization**
The back-to-top component is already exported and needs to be initialized in the main application JavaScript entry point.

#### 4.4 Content Structure

The accessibility statement content is highly structured with nested sections:

```typescript
interface AccessibilityStatement {
  title: string;
  backToTop: string;
  sections: {
    intro: {
      content: string;
      commitment: string;
      features: string[];
      simpleLanguage: string;
      abilityNet: string;
    };
    howAccessible: {
      heading: string;
      content: string;
      issues: string[];
    };
    feedback: {
      heading: string;
      content: string;
      contact: {
        email: string;
        phone: string;
        hours: string;
      };
      response: string;
    };
    reporting: { /* ... */ };
    enforcement: { /* ... */ };
    technical: { /* ... */ };
    compliance: { /* ... */ };
    nonAccessible: { /* ... */ };
    testing: { /* ... */ };
    preparation: { /* ... */ };
  };
}
```

### 5. Accessibility Considerations

#### 5.1 New Window Link Patterns
Opening links in new windows can be disorienting for users, particularly:
- Screen reader users who may not notice the new window
- Users with cognitive disabilities
- Keyboard-only users

**Mitigation Strategy**:
1. Include text indicator in link text (already specified)
2. Use `rel="noopener noreferrer"` for security
3. Consider if new window is truly necessary (GOV.UK guidance generally discourages this)

#### 5.2 Back to Top Link
- Must be keyboard accessible (already handled by `<a>` element)
- Must be visible and clearly labeled
- Should use smooth scrolling for users who can see it
- Should respect `prefers-reduced-motion` for users with vestibular disorders

#### 5.3 Page Structure
- Maintain proper heading hierarchy (h1 → h2 → h3)
- Use semantic HTML throughout
- Ensure adequate color contrast
- Test with screen readers (NVDA, JAWS, VoiceOver)

### 6. Testing Requirements

#### 6.1 Functional Testing
- [ ] English route `/accessibility-statement` loads correctly
- [ ] Welsh route `/datganiad-hygyrchedd` loads correctly
- [ ] Footer link opens in new window
- [ ] Footer link includes appropriate text indicator
- [ ] Back to top link scrolls to top of page
- [ ] Content displays correctly in both languages
- [ ] Language switcher works correctly

#### 6.2 Accessibility Testing
- [ ] WCAG 2.2 AA compliance using axe-core
- [ ] Screen reader testing (NVDA, JAWS, VoiceOver)
- [ ] Keyboard navigation complete flow
- [ ] Color contrast meets 4.5:1 minimum
- [ ] Focus indicators visible
- [ ] Heading hierarchy correct
- [ ] Page renders correctly at 200% and 400% zoom
- [ ] No horizontal scrolling at 320px viewport width

#### 6.3 Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

#### 6.4 E2E Testing
Create Playwright tests for:
- Navigation to accessibility statement from footer
- Language switching between English and Welsh versions
- Back to top functionality
- Link opens in new window/tab

### 7. Content Migration Strategy

Since the DOCX file cannot be directly read by automated tools, the content update process should:

1. **Manual Extraction**: Have stakeholder or team member extract text from DOCX
2. **Structure Mapping**: Map DOCX content to existing TypeScript structure
3. **Translation Verification**: Ensure Welsh translation is accurate and complete
4. **Review Process**: Have accessibility specialist review content for accuracy
5. **Testing**: Verify all content displays correctly in both languages

### 8. Deployment Considerations

#### 8.1 Breaking Changes
- Welsh URL change could break existing bookmarks or external links
- Consider adding redirect from old Welsh URL format to new `/datganiad-hygyrchedd`

#### 8.2 SEO Impact
- New Welsh URL should be indexed separately
- Consider adding hreflang tags to indicate language alternatives
- Update sitemap if one exists

#### 8.3 Analytics
- Track visits to accessibility statement
- Monitor new window opens
- Track back-to-top usage if analytics are configured

### 9. Compliance Verification

This implementation must meet:
- **WCAG 2.2 Level AA**: All success criteria
- **GOV.UK Service Standard**: Points 5 (Accessible), 12 (Government design system)
- **Public Sector Bodies Accessibility Regulations 2018**: Legal requirement
- **GDS Accessibility Patterns**: New window warnings, page structure

### 10. Open Questions

1. **New Window Requirement**: Is opening in a new window truly necessary? GOV.UK guidance generally recommends against this pattern
2. **Content Source**: Who will extract and verify content from the DOCX file?
3. **Welsh Translation**: Has the Welsh translation been professionally verified?
4. **Redirect Strategy**: Should we redirect old Welsh URLs to new format?
5. **Analytics Tracking**: Should back-to-top and new-window opens be tracked?

### 11. Non-Functional Requirements

#### Performance
- Page should load in under 2 seconds on 3G connection
- Back-to-top animation should be smooth (60fps)
- No layout shift during page load

#### Security
- `rel="noopener noreferrer"` prevents tabnabbing attacks
- No sensitive information in accessibility statement
- HTTPS enforced

#### Maintainability
- Content structure allows easy updates
- Separate concerns: controller, content, template
- TypeScript types ensure content structure consistency
- Comprehensive tests prevent regression

### 12. Success Criteria

The implementation is successful when:
1. All functional requirements are met
2. WCAG 2.2 AA compliance verified by automated and manual testing
3. No accessibility issues reported by Digital Accessibility Centre (DAC) audit
4. Welsh and English content both accurate and complete
5. All E2E tests passing
6. Code review approved
7. Stakeholder acceptance obtained
