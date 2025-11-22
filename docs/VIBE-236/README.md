# VIBE-236: CaTH Accessibility Statement - Project Documentation

## Overview

This directory contains comprehensive planning and implementation documentation for updating the CaTH (Court and Tribunal Hearings) service accessibility statement to meet current WCAG 2.2 AA standards and GOV.UK Design System patterns.

## Documents

### 1. [specification.md](./specification.md)
**Technical Specification Document**

Comprehensive analysis of requirements and technical design approach, including:
- Current state analysis of existing implementation
- Detailed requirements breakdown
- Technical design for URL structure, footer links, and back-to-top feature
- Accessibility considerations and compliance requirements
- Testing strategy and success criteria
- Content structure and migration strategy
- Non-functional requirements
- Risk assessment and open questions

**Read this first** to understand the full scope and technical approach.

### 2. [plan.md](./plan.md)
**Implementation Plan**

Step-by-step implementation guide organized into 7 phases:
- **Phase 1**: Content Extraction and Preparation (1-2 hours)
- **Phase 2**: Welsh Route Implementation (2-3 hours)
- **Phase 3**: Back to Top Implementation (1-2 hours)
- **Phase 4**: Footer Link Enhancement (1 hour)
- **Phase 5**: Content Updates (2-3 hours)
- **Phase 6**: Testing and Quality Assurance (3-4 hours)
- **Phase 7**: Documentation and Code Review (1-2 hours)

Includes detailed testing strategy, rollback plan, timeline estimates, and risk assessment.

**Use this** as your implementation guide during development.

### 3. [tasks.md](./tasks.md)
**Task Breakdown**

Granular task list with 42 specific, actionable tasks organized by phase:
- Clear description of work required for each task
- Detailed acceptance criteria
- Files to be modified/created
- Code examples and implementation guidance
- Testing requirements for each task
- Effort estimates

**Use this** for day-to-day development and tracking progress.

### 4. [Accessibility statement.docx](./Accessibility%20statement.docx)
**Source Content Document**

Original accessibility statement content provided by stakeholders. Content from this document needs to be extracted and structured for implementation in Phase 1 and Phase 5.

**Note**: This is a binary DOCX file that requires manual extraction of content.

## Quick Start

### For Developers

1. **Read**: Start with [specification.md](./specification.md) to understand the full scope
2. **Plan**: Review [plan.md](./plan.md) for the implementation approach
3. **Implement**: Follow tasks in [tasks.md](./tasks.md) sequentially
4. **Test**: Complete all testing requirements in Phase 6

### For Project Managers

1. **Timeline**: Total estimated time is 12-17 hours
2. **Dependencies**: Content extraction from DOCX requires stakeholder coordination
3. **Risks**: See risk assessment in [plan.md](./plan.md) and [specification.md](./specification.md)
4. **Deliverables**: See success criteria in [specification.md](./specification.md)

### For QA/Testing

1. **Test Strategy**: Detailed in [plan.md](./plan.md) Phase 6
2. **E2E Tests**: Implementation guidance in [tasks.md](./tasks.md) Task 6.1
3. **Accessibility Testing**: Checklist in [plan.md](./plan.md) Phase 6.2
4. **Browser Testing**: Matrix in [tasks.md](./tasks.md) Task 6.5

## Key Requirements Summary

### Functional Requirements
- ✅ English route at `/accessibility-statement`
- ✅ Welsh route at `/datganiad-hygyrchedd`
- ✅ Footer link opens in new tab with accessibility indicator
- ✅ Back-to-top functionality on accessibility statement pages
- ✅ Updated content specific to CaTH service

### Compliance Requirements
- ✅ WCAG 2.2 Level AA compliance
- ✅ GOV.UK Design System patterns
- ✅ Screen reader compatible
- ✅ Full keyboard accessibility
- ✅ Proper color contrast ratios
- ✅ Responsive at all zoom levels and viewport widths

### Technical Requirements
- ✅ TypeScript strict mode compliance
- ✅ Comprehensive E2E tests with Playwright
- ✅ Unit tests for all new functionality
- ✅ No breaking changes
- ✅ Performance targets met

## Files to Modify/Create

### New Files (3)
- `libs/web-core/src/pages/datganiad-hygyrchedd.ts` - Welsh route controller
- `libs/web-core/src/pages/datganiad-hygyrchedd.test.ts` - Welsh route tests
- `e2e-tests/accessibility-statement.spec.ts` - E2E tests

### Updated Files (10)
- `libs/web-core/src/pages/accessibility-statement/en.ts` - English content
- `libs/web-core/src/pages/accessibility-statement/cy.ts` - Welsh content
- `libs/web-core/src/pages/accessibility-statement/index.ts` - Controller
- `libs/web-core/src/pages/accessibility-statement/index.njk` - Template
- `libs/web-core/src/views/components/site-footer.njk` - Footer component
- `libs/web-core/src/locales/en.ts` - English locale strings
- `libs/web-core/src/locales/cy.ts` - Welsh locale strings
- `apps/web/src/assets/js/index.ts` - JavaScript initialization
- Various test files

## Implementation Phases at a Glance

```
Phase 1: Content Extraction (1-2h)
    ↓
Phase 2: Welsh Route (2-3h)
    ↓
Phase 3: Back to Top (1-2h)
    ↓
Phase 4: Footer Link (1h)
    ↓
Phase 5: Content Updates (2-3h)
    ↓
Phase 6: Testing (3-4h)
    ↓
Phase 7: Documentation (1-2h)
    ↓
Complete! ✅
```

## Testing Strategy Summary

### Automated Testing
- **Unit Tests**: Vitest for all controllers and utilities
- **E2E Tests**: Playwright for user flows
- **Accessibility Tests**: axe-core integration in E2E tests
- **Linting**: Biome for code quality

### Manual Testing
- **Screen Readers**: NVDA, JAWS, VoiceOver
- **Keyboard Navigation**: Complete flow testing
- **Visual Testing**: Contrast, zoom, viewport sizes
- **Browser Testing**: Chrome, Firefox, Safari, Edge, Mobile

### Performance Testing
- **Lighthouse**: Target scores > 90
- **Metrics**: FCP < 1.5s, TBT < 200ms, CLS < 0.1

## Success Criteria

Implementation is complete when:

1. ✅ All functional requirements met
2. ✅ WCAG 2.2 AA compliance verified
3. ✅ All automated tests passing
4. ✅ Manual accessibility testing complete
5. ✅ Code review approved
6. ✅ Stakeholder acceptance obtained

## Support and Questions

### Technical Questions
Refer to:
- [specification.md](./specification.md) Section 10: Open Questions
- [plan.md](./plan.md) Section 8: Risk Assessment

### Implementation Questions
Refer to:
- [tasks.md](./tasks.md) for specific implementation guidance
- Code examples provided in each task

### Testing Questions
Refer to:
- [plan.md](./plan.md) Phase 6: Testing and Quality Assurance
- [tasks.md](./tasks.md) Phase 6 tasks

## Related Resources

### GOV.UK Resources
- [GOV.UK Design System](https://design-system.service.gov.uk/)
- [GOV.UK Accessibility](https://www.gov.uk/guidance/accessibility-requirements-for-public-sector-websites-and-apps)
- [Writing for GOV.UK](https://www.gov.uk/guidance/content-design/writing-for-gov-uk)

### WCAG Resources
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)

### Internal Resources
- [CLAUDE.md](../../../CLAUDE.md) - HMCTS development guidelines
- Repository README for setup instructions
- Existing accessibility statement implementation

## Changelog

- **2024-11-22**: Initial documentation created
  - Technical specification completed
  - Implementation plan created
  - Task breakdown finalized

---

**Ticket**: VIBE-236
**Status**: Planning Complete - Ready for Implementation
**Estimated Effort**: 12-17 hours
**Priority**: High (Accessibility Compliance)
