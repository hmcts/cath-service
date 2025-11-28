# VIBE-175 Implementation Tasks

## Database & Models

- [x] Create Prisma schema for `media_application` table in `apps/postgres/prisma/schema.prisma`
- [x] Run `yarn db:generate` to generate Prisma client
- [x] Run `yarn db:migrate:dev` to create database migration
- [x] Create `libs/public-pages/src/media-application/model.ts` with TypeScript interfaces
- [x] Create `libs/public-pages/src/media-application/database.ts` with Prisma operations
- [x] Write tests for database operations in `database.test.ts`

## File Storage

- [x] Create `libs/public-pages/src/media-application/storage.ts` with file save helper
- [x] Write tests for storage operations in `storage.test.ts`
- [x] Ensure `/storage/temp/files` directory structure is created on first save

## Create Media Account Form Page

- [x] Create `libs/public-pages/src/pages/create-media-account/en.ts` with English content
- [x] Create `libs/public-pages/src/pages/create-media-account/cy.ts` with Welsh translations (fix TIFF issue)
- [x] Create `libs/public-pages/src/pages/create-media-account/validation.ts` with validation logic
- [x] Write tests for validation in `validation.test.ts`
- [x] Create `libs/public-pages/src/pages/create-media-account/index.ts` with GET/POST handlers
- [ ] Write controller tests in `index.test.ts`
- [x] Create `libs/public-pages/src/pages/create-media-account/index.njk` Nunjucks template
- [ ] Write template tests in `index.njk.test.ts`

## Account Request Submitted Confirmation Page

- [x] Create `libs/public-pages/src/pages/account-request-submitted/en.ts` with English content
- [x] Create `libs/public-pages/src/pages/account-request-submitted/cy.ts` with Welsh translations
- [x] Create `libs/public-pages/src/pages/account-request-submitted/index.ts` with GET handler
- [ ] Write controller tests in `index.test.ts`
- [x] Create `libs/public-pages/src/pages/account-request-submitted/index.njk` template
- [ ] Write template tests in `index.njk.test.ts`

## App Integration

- [x] Register file upload middleware in `apps/web/src/app.ts` for `/create-media-account` POST route
- [x] Verify route auto-discovery works for both pages
- [x] Update build configuration if needed (Nunjucks templates copy)

## Testing

- [x] Create E2E test in `e2e-tests/tests/create-media-account.spec.ts`
- [x] Test: Navigate from sign-in page to create media account form
- [x] Test: Submit empty form and verify error messages
- [x] Test: Submit with invalid email and verify error
- [x] Test: Submit with missing file and verify error
- [x] Test: Submit with wrong file type and verify error
- [ ] Test: Submit with file >2MB and verify error
- [ ] Test: Submit without accepting terms and verify error
- [x] Test: Submit valid form and verify success
- [x] Test: Verify database record created with correct data
- [x] Test: Verify file saved to `/storage/temp/files/<id>.<ext>`
- [x] Test: Verify browser refresh clears form
- [x] Test: Verify language toggle (English/Welsh) maintains page state
- [x] Test: Run accessibility tests with axe-core on both pages
- [x] Verify all existing tests still pass

## Manual Verification

- [ ] Test form in browser with various inputs (requires running app)
- [ ] Test file upload with different file types and sizes (requires running app)
- [ ] Verify error messages display correctly (requires running app)
- [ ] Verify Welsh translations display correctly (requires running app)
- [ ] Verify "Back to top" link works (requires running app)
- [ ] Verify CSRF protection works (requires running app)
- [ ] Test on different browsers if possible (requires running app)
- [ ] Verify accessibility with screen reader (requires running app)
- [x] Run `yarn lint:fix` and fix any linting issues
- [x] Run `yarn format` to format code
- [x] Run `yarn test` to ensure all tests pass
- [ ] Run `yarn test:e2e` to ensure E2E tests pass (requires running app)
