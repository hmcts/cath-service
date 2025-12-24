# VIBE-247: Implementation Tasks

## Implementation Tasks

- [x] Create authorisation service module
  - [x] Create `libs/publication/src/authorisation/service.ts` with core authorisation functions
  - [x] Implement `canAccessPublication()` - checks if user can access based on sensitivity and role
  - [x] Implement `canAccessPublicationData()` - checks if user can view actual list data (vs metadata only)
  - [x] Implement `canAccessPublicationMetadata()` - checks if user can view metadata
  - [x] Implement `filterAccessiblePublications()` - filters list of publications by user access
  - [x] Implement provenance matching logic for classified publications

- [x] Create authorisation middleware
  - [x] Create `libs/publication/src/authorisation/middleware.ts`
  - [x] Implement `requirePublicationAccess()` middleware
  - [x] Implement `requirePublicationDataAccess()` middleware
  - [x] Add proper error handling and redirects for unauthorized access

- [x] Update publication module exports
  - [x] Export authorisation functions from `libs/publication/src/index.ts`
  - [x] Ensure TypeScript types are properly exported

- [x] Update public-facing pages
  - [x] Modify `libs/public-pages/src/pages/summary-of-publications/index.ts` to filter publications by user access
  - [x] Modify `libs/public-pages/src/pages/publication/[id].ts` to add authorisation check
  - [x] Update all list type page handlers to include authorisation middleware (e.g., civil-and-family-daily-cause-list)

- [x] Update admin pages
  - [x] Modify `libs/admin-pages/src/pages/remove-list-search-results/index.ts` to show all publications with access indicators
  - [x] Ensure admin deletion works for all sensitivity levels
  - [x] Add visual indicators for publications with restricted data access

- [x] Create error pages
  - [x] Create 403 error page for unauthorized publication access
  - [x] Add appropriate English and Welsh translations
  - [x] Add user-friendly messaging explaining access restrictions

- [x] Write comprehensive tests
  - [x] Unit tests for `authorisation/service.ts` covering all user roles and sensitivity combinations
  - [x] Unit tests for middleware functions
  - [x] Integration tests for filtered publication lists
  - [x] E2E tests for different user roles accessing publications
  - [x] Test edge cases (missing fields, malformed data, etc.)

- [x] Update documentation
  - [x] Document authorisation logic in code comments
  - [x] Update any relevant developer documentation
  - [x] Document the permissions matrix in technical docs

- [ ] Manual testing (to be completed by QA)
  - [ ] Test as unauthenticated public user (only PUBLIC visible)
  - [ ] Test as B2C verified user (PUBLIC, PRIVATE, CLASSIFIED accessible)
  - [ ] Test as CFT IDAM verified user with provenance matching
  - [ ] Test as System Admin (full access)
  - [ ] Test as Local Admin (metadata only for PRIVATE/CLASSIFIED)
  - [ ] Test as CTSC Admin (metadata only for PRIVATE/CLASSIFIED)
  - [ ] Test direct URL access to restricted publications
  - [ ] Test publication deletion by admins
