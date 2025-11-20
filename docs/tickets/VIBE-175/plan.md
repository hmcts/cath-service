# VIBE-175: Create Verified Media Account - Technical Plan

## Technical Approach

This feature implements a media account creation flow with two pages: an application form and a confirmation page. The implementation follows the monorepo pattern with controllers in `libs/public-pages`, using Prisma for database operations and GOV.UK Design System components.

### High-level Strategy
1. Create page controllers and templates in `libs/public-pages/src/pages/create-media-account`
2. Add Prisma schema for `media_application` table in `libs/postgres`
3. Implement file upload handling with validation (jpg/pdf/png, <2MB)
4. Store uploaded files in `apps/web/storage/temp/uploads` with UUID-based naming
5. Add bilingual content (EN/CY) following existing patterns
6. Implement server-side validation with error handling

### Architecture Decisions
- **No new module**: Extend existing `libs/public-pages` package (follows ticket requirement)
- **File storage**: Use local filesystem (`apps/web/storage/temp/uploads`) rather than cloud storage for temp files
- **Database**: Single `media_application` table with UUID primary key
- **Validation**: Server-side only (no client-side JS validation needed per GOV.UK pattern)
- **File naming**: `<uuid>.<ext>` to avoid collisions and tie files to applications

## Implementation Details

### File Structure
```
libs/public-pages/src/pages/create-media-account/
├── index.ts                    # GET/POST controller
├── index.test.ts               # Controller tests
├── index.njk                   # Form template
├── en.ts                       # English content
├── cy.ts                       # Welsh content
└── validation.ts               # Form validation logic

libs/public-pages/src/pages/account-request-submitted/
├── index.ts                    # GET controller
├── index.test.ts               # Controller tests
├── index.njk                   # Confirmation template
├── en.ts                       # English content
└── cy.ts                       # Welsh content

libs/postgres/prisma/
└── schema.prisma               # Add media_application model

libs/web-core/src/middleware/csrf/
├── csrf-middleware.ts          # CSRF middleware implementation
└── csrf-middleware.test.ts     # CSRF middleware tests
```

### Database Schema
Add to `libs/postgres/prisma/schema.prisma`:

```prisma
model MediaApplication {
  id          String   @id @default(cuid())
  fullName    String   @map("full_name")
  email       String
  employer    String
  fileName    String   @map("file_name")
  status      String   @default("PENDING")
  requestDate DateTime @default(now()) @map("request_date")
  statusDate  DateTime @default(now()) @map("status_date")

  @@map("media_application")
}
```

### Form Fields & Validation

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| fullName | text | Yes | 1-100 chars, non-empty |
| email | email | Yes | RFC-compliant email format |
| employer | text | Yes | 1-120 chars, non-empty |
| idProof | file | Yes | jpg/jpeg/pdf/png, ≤2MB |
| termsAccepted | checkbox | Yes | Must be checked |

### Controller Flow

**GET `/create-media-account`**
1. Render form with empty values
2. Include CSRF token

**POST `/create-media-account`**
1. Apply rate limiting (e.g., 5 requests per 15 minutes per IP)
2. Validate CSRF token
3. Parse multipart form data (using multer or similar)
4. Validate all fields:
   - Check required fields present
   - Validate email format
   - Check file type and size
   - Verify terms accepted
5. On validation error:
   - Re-render form with error summary
   - Highlight invalid fields
   - Retain all field values (except file for security)
   - Show "There is a problem" error summary title
6. On success:
   - Generate UUID for record
   - Create database record with status=PENDING
   - Save file to `apps/web/storage/temp/uploads/<uuid>.<ext>`
   - Store filename in database
   - Redirect 303 to `/account-request-submitted`

**GET `/account-request-submitted`**
1. Render confirmation page
2. Show success banner and next steps

### Error Messages

**English:**
- "Enter your full name"
- "Enter an email address in the correct format, like name@example.com"
- "Enter your employer"
- "Select a file in .jpg, .pdf or .png format"
- "Your file must be smaller than 2MB"
- "Select the checkbox to agree to the terms and conditions"

**Welsh:**
- "Nodwch eich enw llawn"
- "Nodwch gyfeiriad e-bost yn y fformat cywir, e.e. name@example.com"
- "Nodwch enw eich cyflogwr"
- "Dewiswch ffeil yn fformat .jpg, .pdf neu .png"
- "Rhaid i'ch ffeil fod yn llai na 2MB"
- "Dewiswch y blwch i gytuno i'r telerau ac amodau"

## Error Handling & Edge Cases

### File Upload Edge Cases
1. **No file selected**: Show "Select a file" error
2. **Invalid file type**: Check MIME type and extension - reject non jpg/pdf/png
3. **File too large**: Reject files >2MB before processing
4. **File system errors**: Log error, show generic error to user
5. **Duplicate submission**: UUID ensures unique files; consider CSRF for form resubmission

### Form Behavior Edge Cases
1. **Page refresh**: Clear all field values (standard GET behavior)
2. **Validation error**: Retain values but don't repopulate file input (security best practice)
3. **CSRF failure**: Show error page, don't retain form data
4. **Database error**: Log error, show generic error message
5. **Terms checkbox**: Must be explicitly checked (no default)

### Security Considerations
1. Validate CSRF token on POST
2. Sanitize filename to prevent path traversal
3. Verify file MIME type matches extension
4. Store files outside web root
5. Don't expose internal error details to users
6. Rate limiting consideration (not in ticket but worth noting)

## Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| Create account link routes to form | Link already exists on sign-in page: `<a href="/create-media-account">Create one here</a>` |
| Form title "Create a Court and tribunal hearings account" | `<h1>` in index.njk with bilingual content |
| Opening wording displayed | Paragraph blocks in template with content from en.ts/cy.ts |
| 3 text inputs (name, email, employer) | GOV.UK Input components in template |
| Email helper text | `hint` property on email input |
| File upload with helper text | GOV.UK File Upload component with hint text |
| Terms section with checkbox | GOV.UK Checkboxes component with descriptive text |
| Continue button | GOV.UK Button component (primary) |
| Back to top link | Link at bottom of template with scroll-to-top |
| Confirmation page on submit | Redirect to `/account-request-submitted` with Panel component |
| "What happens next" section | Content section on confirmation page |
| Database record created | Prisma create operation in controller |
| File stored with correct naming | fs.writeFile with `<id>.<ext>` pattern |
| Welsh translations | cy.ts files with all content translated |
| WCAG 2.2 AA compliance | Semantic HTML, ARIA labels, keyboard navigation, error announcements |

## Open Questions / Clarifications Needed

### CLARIFICATIONS NEEDED

None - all questions resolved.

### RESOLVED

- **File type discrepancy**: Remove "tiff" from Welsh helper text - only jpg/pdf/png are accepted
- **Employer field storage**: Confirmed - `employer` column will be included in the database schema
- **Email validation**: Validate format only (RFC-compliant) - no domain validation or blocklists
- **Rate limiting**: Implement rate limiting on the POST endpoint to prevent abuse
- **CSRF implementation**: CSRF is NOT currently implemented in the codebase (only a placeholder in cookie-preferences template). We need to implement CSRF middleware for this feature.
- **Storage directory creation**: Files will be stored in `apps/web/storage/temp/uploads` (directory already exists per gitignore)
- **File persistence/cleanup**: Cleanup process for rejected applications will be handled in a future ticket

