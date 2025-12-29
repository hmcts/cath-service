# VIBE-312: Delete Court Process - Implementation Tasks

## Implementation Tasks

### Database Schema
- [x] Add migration to add `deleted_at` column to Location table
- [x] Update `libs/location/prisma/schema.prisma` with `deletedAt DateTime? @map("deleted_at")`
- [x] Run `yarn db:migrate:dev` to apply migration
- [x] Run `yarn db:generate` to regenerate Prisma client

### Location Query Updates (Exclude Soft-Deleted)
- [x] Update `libs/location/src/repository/queries.ts` - `getAllLocations()` to filter `WHERE deletedAt: null`
- [x] Update `libs/location/src/repository/queries.ts` - `getLocationById()` to filter `WHERE deletedAt: null`
- [x] Update `libs/location/src/repository/service.ts` - `searchLocations()` to exclude deleted locations
- [x] Write tests for updated query filtering

### Business Logic (libs/system-admin-pages/src/delete-court/)
- [x] Create `libs/system-admin-pages/src/delete-court/queries.ts`
  - [x] Implement `getLocationWithDetails(locationId: number)`
  - [x] Implement `hasActiveSubscriptions(locationId: number)`
  - [x] Implement `hasActiveArtefacts(locationId: string)`
  - [x] Implement `softDeleteLocation(locationId: number)`
- [x] Create `libs/system-admin-pages/src/delete-court/service.ts`
  - [x] Implement `validateLocationForDeletion(locationId: number)`
  - [x] Implement `performLocationDeletion(locationId: number)`
- [x] Create `libs/system-admin-pages/src/delete-court/validation.ts`
  - [x] Implement `validateLocationSelected(locationId)`
  - [x] Implement `validateRadioSelection(value)`
- [x] Write unit tests for queries.ts
- [x] Write unit tests for service.ts
- [x] Write unit tests for validation.ts

### Page 1: Find the Court to Remove (/delete-court)
- [x] Create `libs/system-admin-pages/src/pages/delete-court/en.ts` with English content
- [x] Create `libs/system-admin-pages/src/pages/delete-court/cy.ts` with Welsh content
- [x] Create `libs/system-admin-pages/src/pages/delete-court/index.ts` controller
  - [x] Implement GET handler (render search form)
  - [x] Implement POST handler (validate and store in session)
- [x] Create `libs/system-admin-pages/src/pages/delete-court/index.njk` template
  - [x] Add autocomplete input for court search
  - [x] Add error summary component
  - [x] Add back link to dashboard
- [ ] Write unit tests for page controller

### Page 2: Confirmation (/delete-court-confirm)
- [x] Create `libs/system-admin-pages/src/pages/delete-court-confirm/en.ts` with English content
- [x] Create `libs/system-admin-pages/src/pages/delete-court-confirm/cy.ts` with Welsh content
- [x] Create `libs/system-admin-pages/src/pages/delete-court-confirm/index.ts` controller
  - [x] Implement GET handler (fetch location details, render table)
  - [x] Implement POST handler (validate, check subscriptions/artefacts, soft delete)
- [x] Create `libs/system-admin-pages/src/pages/delete-court-confirm/index.njk` template
  - [x] Add summary table with location details
  - [x] Add radio buttons (Yes/No)
  - [x] Add error summary component
  - [x] Add back link to search
- [ ] Write unit tests for page controller

### Page 3: Delete Successful (/delete-court-success)
- [x] Create `libs/system-admin-pages/src/pages/delete-court-success/en.ts` with English content
- [x] Create `libs/system-admin-pages/src/pages/delete-court-success/cy.ts` with Welsh content
- [x] Create `libs/system-admin-pages/src/pages/delete-court-success/index.ts` controller
  - [x] Implement GET handler (render success page, clear session)
- [x] Create `libs/system-admin-pages/src/pages/delete-court-success/index.njk` template
  - [x] Add success banner (green)
  - [x] Add link back to dashboard
- [ ] Write unit tests for page controller

### Dashboard Integration
- [x] Update `libs/system-admin-pages/src/pages/system-admin-dashboard/en.ts` - Add "Delete Court" tile (already exists, verify href)
- [x] Update `libs/system-admin-pages/src/pages/system-admin-dashboard/cy.ts` - Add Welsh translation for tile (verify)

### Session Type Extensions
- [x] Add TypeScript session interface for `deleteCourt` data in appropriate types file

### E2E Tests
- [ ] Create `e2e-tests/tests/delete-court.spec.ts` with ONE comprehensive test:
  - [ ] Complete journey: dashboard → search → confirm → success
  - [ ] Validation: empty search, no radio selection
  - [ ] Welsh translation checks inline
  - [ ] Accessibility checks with AxeBuilder inline
  - [ ] Subscription blocking scenario (with test data)
  - [ ] Artefact blocking scenario (with test data)

### Build Configuration
- [x] Verify `libs/system-admin-pages/package.json` includes `build:nunjucks` script
- [x] Test build: `yarn build` from system-admin-pages directory
- [x] Verify templates copied to dist/

### Manual Testing
- [ ] Test complete delete flow in development environment
- [ ] Verify Welsh translations throughout journey
- [ ] Test with active subscriptions (should block)
- [ ] Test with active artefacts (should block)
- [ ] Test successful deletion (no subscriptions/artefacts)
- [ ] Verify deleted court not visible in location searches
- [ ] Verify deleted court not visible in subscription pages
- [ ] Test keyboard navigation and screen reader compatibility
- [ ] Test error scenarios (empty form, invalid selections)

### Documentation
- [ ] Update CLAUDE.md if new patterns introduced
- [ ] Add comments to complex business logic
- [ ] Document session data structure
