# VIBE-241: Cookie Policy Page - Implementation Plan

## Summary

Add a comprehensive Cookie Policy information page at `/cookie-policy` that explains what cookies are, which cookies the CaTH service uses, and provides links to manage preferences. This is separate from the existing `/cookie-preferences` settings page.

## Context

The CaTH service already has:
- Cookie consent management at `/cookie-preferences`
- Cookie banner component
- Cookie middleware infrastructure

This ticket adds informational content to help users understand cookies before managing preferences.

## Implementation Approach

### Phase 1: Create Cookie Policy Page (1.5 hours)

**Step 1.1: Create page structure** (15 mins)
```bash
mkdir -p libs/web-core/src/pages/cookie-policy
touch libs/web-core/src/pages/cookie-policy/index.ts
touch libs/web-core/src/pages/cookie-policy/index.njk
touch libs/web-core/src/pages/cookie-policy/en.ts
touch libs/web-core/src/pages/cookie-policy/cy.ts
```

**Step 1.2: Implement controller** (15 mins)
Create simple GET handler that renders the template with bilingual content.

**Step 1.3: Build template** (30 mins)
- Extend base-template.njk layout
- Create heading hierarchy (h1, h2)
- Add cookie tables using govukTable component
- Add "Manage cookie preferences" button linking to /cookie-preferences
- Ensure responsive layout (govuk-grid-row)

**Step 1.4: Write content** (30 mins)
- English content in en.ts
- Document essential cookies (connect.sid, cookie_policy, cookies_preferences_set)
- Document analytics cookies (_ga, _gid)
- Document performance cookies (dtCookie, dtSa, rxVisitor, rxvt)
- Add explanatory text about cookie purposes
- Include GDPR/PECR legal references

### Phase 2: Welsh Translation (45 mins)

**Step 2.1: Draft Welsh content** (30 mins)
Translate all sections:
- Page title and introduction
- Cookie category headings
- Table headers (Name, Purpose, Expires)
- Cookie descriptions
- Call-to-action text

**Step 2.2: Review process** (15 mins)
- Submit for Welsh translation team review if required
- Placeholder: Mark where professional translation needed
- Test Welsh page renders correctly with `?lng=cy`

### Phase 3: Update Navigation (30 mins)

**Step 3.1: Update footer links** (15 mins)
Options:
1. Add separate "Cookie policy" link alongside "Cookie preferences"
2. Replace "Cookies" with "Cookie policy", link to /cookie-policy (which then links to preferences)

Recommendation: Option 2 for simplicity
- Update libs/web-core/src/views/components/site-footer.njk
- Change href from `/cookie-preferences` to `/cookie-policy`
- Update link text in locales

**Step 3.2: Update cookie banner** (15 mins)
- Update libs/web-core/src/views/components/cookie-banner.njk
- Consider adding "View cookie policy" link alongside "View cookies"
- Or change "View cookies" to point to policy page

### Phase 4: Testing (1.5 hours)

**Step 4.1: Manual testing** (30 mins)
- [ ] Navigate to /cookie-policy
- [ ] Verify all content renders correctly
- [ ] Test Welsh version with ?lng=cy
- [ ] Click "Manage cookie preferences" button
- [ ] Verify footer link works
- [ ] Test on mobile viewport

**Step 4.2: E2E tests** (45 mins)
Create `e2e-tests/tests/cookie-policy.spec.ts`:
```typescript
test('Cookie policy page renders', async ({ page }) => {
  await page.goto('/cookie-policy');
  await expect(page.locator('h1')).toContainText('Cookie policy');
  await expect(page.locator('table')).toBeVisible();
});

test('Cookie policy links to preferences', async ({ page }) => {
  await page.goto('/cookie-policy');
  await page.click('text=Manage cookie preferences');
  await expect(page).toHaveURL('/cookie-preferences');
});

test('Welsh cookie policy renders', async ({ page }) => {
  await page.goto('/cookie-policy?lng=cy');
  await expect(page.locator('h1')).toContainText('Polisi cwcis');
});
```

**Step 4.3: Accessibility testing** (15 mins)
Add to existing accessibility tests:
```typescript
test('Cookie policy is accessible', async ({ page }) => {
  await page.goto('/cookie-policy');
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

**Step 4.4: Verify existing functionality** (15 mins)
Ensure no regressions:
- Cookie preferences page still works
- Cookie banner still works
- Cookie consent still persists

### Phase 5: Documentation (15 mins)

**Step 5.1: Update README** (10 mins)
Document new page in web-core README:
- Purpose of cookie-policy vs cookie-preferences
- How to update cookie information
- Translation process

**Step 5.2: Code comments** (5 mins)
Add comments explaining distinction between policy and preferences pages.

## File Changes

### New Files
```
libs/web-core/src/pages/cookie-policy/
├── index.ts              # GET handler
├── index.njk             # Template
├── en.ts                 # English content
└── cy.ts                 # Welsh content
```

### Modified Files
```
libs/web-core/src/views/components/site-footer.njk  # Update link
libs/web-core/src/locales/en.ts                     # Footer link text
libs/web-core/src/locales/cy.ts                     # Footer link text (Welsh)
e2e-tests/tests/cookie-policy.spec.ts               # New test file
```

### Potentially Modified
```
libs/web-core/src/views/components/cookie-banner.njk  # Optional: add policy link
```

## Technical Decisions

### 1. Page vs Settings Separation
**Decision**: Keep `/cookie-policy` (info) separate from `/cookie-preferences` (settings)
**Rationale**:
- Clear separation of concerns
- Users who want info don't need settings UI
- Users who want settings can navigate directly there
- Follows GOV.UK pattern of info pages linking to action pages

### 2. Footer Link Strategy
**Decision**: Footer links to `/cookie-policy`, which has prominent link to preferences
**Rationale**:
- Single "Cookies" footer link is cleaner
- Policy page acts as hub for all cookie information
- Most users want information before changing settings

### 3. Content Organization
**Decision**: Use tables for cookie details, not lists
**Rationale**:
- govukTable component is accessible by default
- Structured format easier to scan
- Standard GOV.UK pattern for this type of data

### 4. Translation Approach
**Decision**: Include all translations in initial PR, flag for review
**Rationale**:
- Machine translation acceptable as placeholder
- Welsh team can review before production deployment
- Don't block implementation on translation approval

## Testing Strategy

### Unit Tests
Not required for simple controller that just renders a template.

### Integration Tests
Not required - no form processing or state changes.

### E2E Tests
Required:
- Page renders with correct content
- Navigation works (footer link, preferences button)
- Welsh translation works
- Tables display correctly

### Accessibility Tests
Required:
- WCAG 2.2 AA compliance via axe-core
- Keyboard navigation
- Screen reader compatibility (verify table structure)

## Deployment Strategy

1. **Development**: Test locally with `yarn dev`
2. **PR Review**: Submit for code review
3. **Staging**: Deploy to staging environment
4. **Manual QA**: Verify all content and links
5. **Welsh Review**: Submit Welsh content for review (if not blocking)
6. **Production**: Deploy with standard release process

## Rollback Plan

Low risk change. If issues arise:
1. Revert footer link to point back to `/cookie-preferences`
2. Page at `/cookie-policy` can remain (no harm if not linked)
3. Full rollback via git revert

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Welsh translation incorrect | Medium | Low | Professional review before production |
| Cookie information outdated | Low | Low | Document update process in README |
| User confusion with two pages | Low | Low | Clear labeling: "policy" vs "preferences" |
| Accessibility issues in tables | Medium | Low | Test with axe-core and screen readers |

## Success Criteria

1. Users can access comprehensive cookie information at `/cookie-policy`
2. Page includes details on all cookies used (essential, analytics, performance)
3. Full Welsh translation available
4. WCAG 2.2 AA compliant
5. Clear navigation to cookie preferences page
6. E2E tests cover key user journeys
7. No regressions in existing cookie functionality

## Out of Scope

- Changing cookie consent logic
- Adding new cookie categories
- Cookie banner redesign
- Integration with external cookie management platforms
- Cookie audit logging
- Consent analytics dashboard

## Follow-Up Tasks

After implementation:
1. Monitor user navigation patterns (policy vs preferences)
2. Check for accessibility complaints
3. Update cookie information as new cookies are added
4. Consider adding "last updated" date to policy page
5. Review analytics on page views and bounce rate

## Timeline Estimate

- Phase 1 (Page Creation): 1.5 hours
- Phase 2 (Welsh Translation): 45 mins
- Phase 3 (Navigation): 30 mins
- Phase 4 (Testing): 1.5 hours
- Phase 5 (Documentation): 15 mins

**Total: ~4.5 hours of development work**

## Dependencies

None. All required infrastructure exists in the codebase.

## Approvals Required

- Code review (standard)
- Welsh translation review (post-deployment acceptable)
- QA sign-off (standard)
- No special security or legal review needed (informational page)
