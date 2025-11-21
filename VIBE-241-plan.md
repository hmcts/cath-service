# VIBE-241: Cookie Policy - Implementation Plan

## Summary
Implement a GOV.UK-compliant Cookie Policy page with configurable cookie consent management, allowing users to control analytics and performance monitoring cookies independently.

## Implementation Approach

### Phase 1: Module Setup (30 mins)
1. Create `libs/cookie-policy` module structure
2. Configure package.json with build scripts and dependencies
3. Add TypeScript configuration
4. Register module in root tsconfig.json

### Phase 2: Core Services (1 hour)
1. Implement `cookie-service.ts`:
   - Read/write cookie preferences
   - Default preferences (opt-out)
   - Cookie serialization/deserialization
2. Create `cookie-consent-middleware.ts`:
   - Extract preferences from request
   - Attach to res.locals for templates
   - Handle missing/invalid preferences

### Phase 3: Page Implementation (2 hours)
1. Build controller (`cookie-policy.ts`):
   - GET handler with current preferences
   - POST handler with validation
   - Error handling with GOV.UK patterns
2. Create Nunjucks template (`cookie-policy.njk`):
   - Full cookie policy content
   - Radio button groups for preferences
   - Save button and validation errors
   - Contact accordion
   - Back to Top functionality
3. Add translations (en.ts, cy.ts)

### Phase 4: Integration (1 hour)
1. Update footer component with "Cookies" link
2. Modify layout template for conditional script loading
3. Register module in apps/web/src/app.ts
4. Update Vite config for assets

### Phase 5: Testing (2 hours)
1. Unit tests for cookie service
2. Integration tests for POST endpoint
3. E2E tests with Playwright:
   - Footer link behavior
   - Save preferences flow
   - Script loading based on consent
   - Welsh translation
   - Accessibility
   - Keyboard navigation

### Phase 6: Content & Documentation (1 hour)
1. Extract content from Cookie Policy.docx attachment
2. Format for Nunjucks template
3. Verify Welsh translations
4. Update README with cookie policy information

## Technical Decisions

### Cookie Storage Format
```json
{
  "analytics": false,
  "performance": false,
  "version": 1
}
```
- Cookie name: `cookie_preferences`
- Expiry: 365 days
- SameSite: Lax
- Secure: true (production)

### Default Behavior
- No tracking until explicit consent
- Analytics: Default OFF
- Performance: Default OFF
- Complies with GDPR/PECR

### Script Loading Strategy
Server-side gating using middleware:
- Check cookie_preferences before rendering layout
- Pass boolean flags to template
- Conditionally include GA/Dynatrace script tags

## File Changes

### New Files
- `libs/cookie-policy/package.json`
- `libs/cookie-policy/tsconfig.json`
- `libs/cookie-policy/src/config.ts`
- `libs/cookie-policy/src/index.ts`
- `libs/cookie-policy/src/pages/cookie-policy.ts`
- `libs/cookie-policy/src/pages/cookie-policy.njk`
- `libs/cookie-policy/src/services/cookie-service.ts`
- `libs/cookie-policy/src/middleware/cookie-consent-middleware.ts`
- `libs/cookie-policy/src/locales/en.ts`
- `libs/cookie-policy/src/locales/cy.ts`
- `libs/cookie-policy/src/cookie-policy.test.ts`

### Modified Files
- `apps/web/src/app.ts` - Register cookie-policy module
- `apps/web/vite.config.ts` - Add cookie-policy assets
- `libs/govuk-frontend/src/views/layouts/default.njk` - Conditional scripts
- `libs/govuk-frontend/src/views/partials/footer.njk` - Add Cookies link
- `tsconfig.json` - Add cookie-policy path alias

## Dependencies
- express: ^5.1.0 (peer)
- @hmcts/govuk-frontend (existing)
- cookie-parser (likely already installed)

## Testing Strategy

### Unit Tests
- Cookie service serialization
- Preference validation
- Default values

### Integration Tests
- GET /cookies-policy renders correctly
- POST /cookies-policy saves preferences
- POST validation errors
- Cookie expiry headers

### E2E Tests (Playwright)
- Footer link opens new tab
- Form submission with valid data
- Form submission with invalid data
- Preference persistence across page loads
- GA script loads only with consent
- Welsh language toggle
- Back to Top scroll behavior
- Accordion expand/collapse
- Keyboard navigation
- Screen reader compatibility

## Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| Footer link on every page | Update footer.njk partial |
| Link opens in new window | target="_blank" rel="noopener noreferrer" |
| Full cookie policy content | Extract from docx, add to template |
| Welsh translation | cy.ts locale file, i18n middleware |
| Cookie settings controls | GOV.UK radios component |
| Two independent categories | Separate radio groups |
| Save button | govukButton component |
| Settings persist | cookie_preferences cookie (1 year) |
| Opt-out disables cookies | Middleware blocks script loading |
| Contact accordion | govukDetails component |
| Back to Top | Scroll-to-top link with JS |
| Validation errors | govukErrorSummary |

## Rollout Plan
1. Deploy to development environment
2. Manual QA testing
3. Accessibility audit
4. Welsh translation review
5. Deploy to staging
6. User acceptance testing
7. Production deployment

## Monitoring
- Track cookie_preferences acceptance rate
- Monitor GA/Dynatrace data volume changes
- Watch for validation errors in logs
- Check accessibility complaints

## Future Enhancements (Out of Scope)
- Cookie banner on first visit
- Granular cookie categories (e.g., marketing, social)
- Cookie audit trail
- Integration with central HMCTS consent management
