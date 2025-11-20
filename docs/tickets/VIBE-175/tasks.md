# VIBE-175: Implementation Tasks

## CSRF Middleware Setup
- [ ] Install CSRF package (e.g., `csrf-sync` or `csurf`)
- [ ] Create `libs/web-core/src/middleware/csrf/csrf-middleware.ts`
- [ ] Implement CSRF middleware configuration
- [ ] Export CSRF middleware from `libs/web-core/src/index.ts`
- [ ] Add CSRF middleware to `apps/web/src/app.ts` (after session middleware)
- [ ] Write unit tests for CSRF middleware
- [ ] Update cookie-preferences template to use working csrfToken

## Database Setup
- [ ] Add `media_application` model to `libs/postgres/prisma/schema.prisma`
- [ ] Run `yarn db:generate` to generate Prisma client
- [ ] Run `yarn db:migrate:dev` to create database migration
- [ ] Verify migration applied successfully

## File Storage Setup
- [ ] Verify `apps/web/storage/temp/uploads` directory exists (already in gitignore)
- [ ] Implement file save utility function with error handling

## Create Media Account Page
- [ ] Create `libs/public-pages/src/pages/create-media-account/` directory
- [ ] Create `index.ts` controller with GET handler (render empty form)
- [ ] Create `index.ts` POST handler with validation and file upload
- [ ] Create `validation.ts` with field validation functions
- [ ] Create `en.ts` with all English content
- [ ] Create `cy.ts` with all Welsh content
- [ ] Create `index.njk` template with GOV.UK components:
  - Error summary component
  - Input components (fullName, email, employer)
  - File upload component
  - Checkboxes component (terms)
  - Button component
  - Back to top link
- [ ] Configure multer or file upload middleware for multipart forms
- [ ] Implement file type and size validation
- [ ] Implement database record creation with Prisma
- [ ] Implement file save to `apps/web/storage/temp/uploads/<uuid>.<ext>`
- [ ] Implement rate limiting on POST endpoint
- [ ] Add error handling for validation failures
- [ ] Add error handling for file system failures
- [ ] Add error handling for database failures

## Account Request Submitted Page
- [ ] Create `libs/public-pages/src/pages/account-request-submitted/` directory
- [ ] Create `index.ts` controller with GET handler
- [ ] Create `en.ts` with English confirmation content
- [ ] Create `cy.ts` with Welsh confirmation content
- [ ] Create `index.njk` template with Panel component and next steps

## Testing
- [ ] Write unit tests for validation functions
- [ ] Write unit tests for create-media-account GET controller
- [ ] Write unit tests for create-media-account POST controller (success case)
- [ ] Write unit tests for create-media-account POST controller (validation errors)
- [ ] Write unit tests for account-request-submitted GET controller
- [ ] Add E2E test for successful account creation flow
- [ ] Add E2E test for validation error scenarios
- [ ] Add E2E test for file upload validation (type and size)
- [ ] Add E2E test for Welsh language toggle
- [ ] Run accessibility tests with Axe

## Code Quality
- [ ] Run `yarn lint:fix` to fix linting issues
- [ ] Run `yarn format` to format code
- [ ] Run `yarn test` to ensure all tests pass
- [ ] Verify TypeScript compilation with no errors

## Integration & Verification
- [ ] Test form submission with valid data
- [ ] Verify database record created with correct fields
- [ ] Verify file saved to correct location with correct name
- [ ] Test all validation error scenarios
- [ ] Test page refresh clears form values
- [ ] Test Welsh translations display correctly
- [ ] Test error summary appears with correct title
- [ ] Test file upload with invalid types
- [ ] Test file upload with oversized file
- [ ] Verify CSRF protection works
- [ ] Test keyboard navigation and screen reader compatibility

## Documentation
- [ ] Update any relevant documentation if needed
- [ ] Address clarifications from plan.md before marking complete
