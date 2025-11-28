# VIBE-175 Technical Implementation Plan

## 1. Technical Approach

### High-Level Strategy
Implement a public-facing media account creation form following the existing monorepo patterns:
- Create new page controllers in `libs/public-pages/src/pages/` following the established pattern
- Separate language files (en.ts, cy.ts) for each page containing translations
- Validation logic colocated in a separate validation.ts file
- File storage using filesystem (not Redis like manual-upload) as per spec
- Database persistence using Prisma with new `media_application` table
- No authentication required (public pages)

### Architecture Decisions
- **Module Location**: `libs/public-pages/src/pages/` - This is already where public pages like sign-in live
- **File Upload**: Use existing `createFileUpload` from `@hmcts/web-core` with 2MB limit
- **Storage**: Write to filesystem at `/storage/temp/files/<id>.<ext>` (different from manual-upload which uses `/storage/temp/uploads`)
- **Database**: New Prisma schema in `apps/postgres/prisma/schema.prisma` following snake_case conventions
- **Session Management**: Use Express session to retain form values on validation errors and clear on refresh
- **Validation**: Server-side only (no client-side JS validation needed per GDS patterns)

### Key Technical Considerations
1. **File Storage Path**: Ticket specifies `/storage/temp/files` which differs from existing manual-upload pattern (`/storage/temp/uploads`). We'll need to create a new storage helper.
2. **Database Schema**: Use UUID for id (not CUID like other tables) as specified in ticket
3. **Form State Management**: Follow manual-upload pattern - store form data in session on error, clear on GET if not submitted
4. **File Upload Middleware**: Register in `apps/web/src/app.ts` similar to manual-upload pattern
5. **Welsh Translation Discrepancy**: Welsh helper text mentions TIFF but validation only allows jpg/pdf/png - we'll flag this in clarifications

## 2. Implementation Details

### File Structure
```
libs/public-pages/src/pages/
├── create-media-account/
│   ├── index.ts              # GET/POST handlers
│   ├── index.njk             # Form template
│   ├── index.test.ts         # Controller tests
│   ├── index.njk.test.ts     # Template tests
│   ├── en.ts                 # English content
│   ├── cy.ts                 # Welsh content
│   ├── validation.ts         # Form validation logic
│   └── validation.test.ts    # Validation tests
├── account-request-submitted/
│   ├── index.ts              # GET handler
│   ├── index.njk             # Confirmation template
│   ├── index.test.ts         # Controller tests
│   ├── index.njk.test.ts     # Template tests
│   ├── en.ts                 # English content
│   └── cy.ts                 # Welsh content

libs/public-pages/src/media-application/
├── model.ts                   # TypeScript interfaces and types
├── storage.ts                 # File storage helper
├── storage.test.ts            # Storage tests
├── database.ts                # Prisma database operations
└── database.test.ts           # Database tests
```

### Components to Create

#### 1. Database Schema (Prisma)
```prisma
// apps/postgres/prisma/schema.prisma

model MediaApplication {
  id          String   @id @default(uuid()) @db.Uuid
  fullName    String   @map("full_name")
  email       String
  employer    String
  status      String   @default("PENDING")
  requestDate DateTime @default(now()) @map("request_date")
  statusDate  DateTime @default(now()) @map("status_date")

  @@map("media_application")
}
```

#### 2. Controllers

**create-media-account/index.ts**
- GET handler: Render form with data from session (if validation failed) or empty
- POST handler:
  - Validate form fields + file
  - Check for multer errors (file size)
  - On error: Store in session, redirect to GET
  - On success: Save to DB, save file to `/storage/temp/files/<id>.<ext>`, redirect to confirmation
  - Use PRG (Post-Redirect-Get) pattern

**account-request-submitted/index.ts**
- GET handler: Simple render of confirmation page
- No POST handler needed

#### 3. Templates

**create-media-account/index.njk**
- Use `govukInput` for text fields (fullName, email, employer)
- Use `govukFileUpload` for ID proof
- Use `govukCheckboxes` for terms acceptance
- Use `govukErrorSummary` when errors present
- Include helper text for email and file upload
- Display terms text in a readable format
- Include "Back to top" link at bottom

**account-request-submitted/index.njk**
- Display success banner with "Details submitted"
- Show "What happens next" section with instructions
- No form, just informational content

#### 4. Validation Logic (validation.ts)

**Required Field Validation:**
- `fullName`: Required, 1-100 chars, alphabetic + spaces + common punctuation (regex: `/^[a-zA-Z\s\-',.]+$/`)
- `email`: Required, RFC-compliant (use regex or library validation)
- `employer`: Required, 1-120 chars
- `idProof`: Required file
- `termsAccepted`: Must be 'on' or 'true'

**File Validation:**
- Must be present
- Extension must be .jpg, .jpeg, .pdf, or .png (case-insensitive)
- Size <= 2MB (checked by multer middleware, but also validate)
- Use mimetype validation as additional check

**Error Messages:** (from ticket)
- "Enter your full name"
- "Enter an email address in the correct format, like name@example.com"
- "Enter your employer"
- "Select a file in .jpg, .pdf or .png format"
- "Your file must be smaller than 2MB"
- "Select the checkbox to agree to the terms and conditions"

#### 5. File Storage (storage.ts)

Create helper function similar to `file-storage.ts` in manual-upload:
```typescript
const TEMP_STORAGE_BASE = path.join(process.cwd(), "storage", "temp", "files");

export async function saveIdProofFile(
  applicationId: string,
  originalFileName: string,
  fileBuffer: Buffer
): Promise<void> {
  const fileExtension = path.extname(originalFileName);
  const newFileName = `${applicationId}${fileExtension}`;

  await fs.mkdir(TEMP_STORAGE_BASE, { recursive: true });

  const filePath = path.join(TEMP_STORAGE_BASE, newFileName);
  await fs.writeFile(filePath, fileBuffer);
}
```

#### 6. Database Operations (database.ts)

Create Prisma operations:
```typescript
export async function createMediaApplication(data: {
  fullName: string;
  email: string;
  employer: string;
}): Promise<string> {
  const application = await prisma.mediaApplication.create({
    data: {
      fullName: data.fullName,
      email: data.email.toLowerCase(), // normalize email
      employer: data.employer,
      status: 'PENDING',
      requestDate: new Date(),
      statusDate: new Date()
    }
  });
  return application.id;
}
```

#### 7. App Registration (apps/web/src/app.ts)

Add file upload middleware registration:
```typescript
// Register create-media-account with file upload middleware
app.post("/create-media-account", (req, res, next) => {
  upload.single("idProof")(req, res, (err) => {
    if (err) {
      req.fileUploadError = err;
    }
    next();
  });
});
```

Routes are auto-discovered from the pages directory structure, so no additional route registration needed.

#### 8. Session Management

Extend session interface:
```typescript
// In libs/public-pages/src/media-application/model.ts
declare module "express-session" {
  interface SessionData {
    mediaApplicationForm?: MediaApplicationFormData;
    mediaApplicationErrors?: ValidationError[];
    mediaApplicationSubmitted?: boolean;
  }
}
```

### Welsh Translations

All content must be provided in both English and Welsh. Each page has separate `en.ts` and `cy.ts` files with identical structure but translated content. The i18n middleware automatically selects the correct language based on the `lng` query parameter or cookie.

## 3. Error Handling & Edge Cases

### Validation Error Scenarios

1. **Empty Form Submission**
   - Show all required field errors
   - Error summary at top with title "There is a problem"
   - Inline errors on each field
   - Focus error summary on page load

2. **Invalid Email Format**
   - Show email-specific error message
   - Retain all other field values
   - Highlight email field in red

3. **Missing File**
   - Show file upload error
   - Retain form values

4. **Wrong File Type**
   - Validate extension (.jpg, .jpeg, .pdf, .png)
   - Also check mimetype
   - Show appropriate error message

5. **File Too Large (>2MB)**
   - Multer will throw LIMIT_FILE_SIZE error
   - Catch in POST handler via `req.fileUploadError`
   - Show size error message
   - Retain form values (except file)

6. **Terms Not Accepted**
   - Show checkbox error
   - Retain all field values

7. **Multiple Validation Errors**
   - Display all errors in summary
   - Link each error to corresponding field
   - Show inline error for each field

### Edge Cases

1. **Browser Refresh on GET**
   - Clear form data from session if not successfully submitted
   - Render empty form
   - Follows manual-upload pattern: `if (!wasSubmitted) { delete req.session.mediaApplicationForm; }`

2. **Browser Back Button from Confirmation**
   - User can navigate back but form should be cleared
   - No special handling needed - standard browser behavior

3. **Session Expiry**
   - Form data lost, user starts fresh
   - No error message needed

4. **Database Connection Failure**
   - Catch Prisma errors in try-catch
   - Show generic error page or redirect to 500 error
   - Log error for debugging

5. **File System Write Failure**
   - Catch fs errors in try-catch
   - Roll back database transaction if possible
   - Show error to user

6. **CSRF Token Missing/Invalid**
   - Express CSRF middleware will handle
   - Return 403 Forbidden
   - No additional code needed

7. **Special Characters in Name**
   - Validate against allowed characters
   - Allow: letters, spaces, hyphens, apostrophes, commas, periods
   - Reject others with validation error

8. **Very Long Field Values**
   - Enforce max lengths: fullName (100), employer (120)
   - Trim whitespace before validation
   - Show appropriate error if exceeded

9. **Email Already Exists**
   - Ticket doesn't specify uniqueness constraint
   - Allow duplicate emails (multiple applications from same person)
   - No validation needed

10. **Concurrent Submissions**
    - UUID generation ensures unique IDs
    - No race condition concerns

11. **Malicious File Upload**
    - Validate mimetype in addition to extension
    - Store in temp directory (not web-accessible)
    - Files are reviewed manually before approval
    - No additional sanitization specified

12. **File Extension Mismatch**
    - Check both extension and mimetype
    - Reject if mismatch detected

## 4. Acceptance Criteria Mapping

| AC # | Requirement | Implementation | Verification |
|------|-------------|----------------|--------------|
| 1 | Link from sign-in page to form | Update `sign-in/index.njk` - already has link to `/create-media-account` | E2E test: Click link, verify navigation |
| 2 | Opening wording appears | Include in `en.ts` and `cy.ts` | Visual inspection, E2E test |
| 3 | Form includes all fields | Use GOV.UK components in template | Visual inspection, E2E test |
| 4 | Email helper text displayed | Add hint to `govukInput` | Visual inspection, E2E test |
| 5 | Upload control text and constraints | Add hint to `govukFileUpload` | Visual inspection, E2E test |
| 6 | Terms and conditions content + checkbox | Use `govukCheckboxes` with HTML content | Visual inspection, E2E test |
| 7 | "Back to top" arrow at bottom | Add link in template | Visual inspection, E2E test |
| 8 | Redirect to confirmation on success | `res.redirect("/account-request-submitted")` | E2E test: Submit valid form |
| 9 | Data saved to DB and file saved | Call Prisma + fs in POST handler | E2E test: Verify DB row and file exist |
| 10 | All CaTH page specs maintained | Use GOV.UK Design System, proper layout | Accessibility tests, visual inspection |

## 5. Open Questions / CLARIFICATIONS NEEDED

1. **Welsh Translation Discrepancy**
   - **Issue**: Welsh helper text mentions "tiff" format but English spec only allows jpg/pdf/png (max 2MB)
   - **Question**: Should TIFF be added to allowed formats? Or should Welsh text be corrected to remove TIFF?
   - **Recommendation**: Remove TIFF from Welsh translation to match English spec (jpg, pdf, png only)

2. **Email Uniqueness**
   - **Issue**: Ticket doesn't specify if email should be unique
   - **Question**: Should we prevent duplicate email submissions? Add unique constraint to DB?
   - **Recommendation**: Allow duplicates (no unique constraint) - users may submit multiple applications

3. **Employer Field Validation**
   - **Issue**: No specific validation rules beyond length (1-120 chars)
   - **Question**: Should we restrict to alphanumeric + certain characters like fullName? Or allow any characters?
   - **Recommendation**: Allow any characters (less restrictive) - employer names can be diverse

4. **File Storage Cleanup**
   - **Issue**: Files stored in temp directory but no cleanup mechanism specified
   - **Question**: When/how should files be deleted? After approval/rejection? Time-based expiry?
   - **Recommendation**: Leave for future ticket - manual cleanup or batch job implementation

5. **Status Transitions**
   - **Issue**: Table has `status` and `statusDate` but only PENDING is used in this ticket
   - **Question**: What are the other valid statuses? (APPROVED, REJECTED, etc.)
   - **Recommendation**: Define enum in Prisma schema for future use: `enum MediaApplicationStatus { PENDING APPROVED REJECTED }`

6. **Error Logging**
   - **Issue**: Ticket mentions "standard logging" but doesn't specify what to log
   - **Question**: What events should be logged? (Application created, file upload errors, validation errors?)
   - **Recommendation**: Log: application created (with ID), file upload errors, database errors, file system errors

7. **Accessibility Testing**
   - **Issue**: Ticket mentions WCAG 2.2 AA compliance
   - **Question**: Should we run automated accessibility tests (axe-core) in E2E tests?
   - **Recommendation**: Yes - add axe-core checks to E2E tests for both pages

8. **Back to Top Link**
   - **Issue**: Ticket specifies "Back to top" arrow but doesn't clarify if it's a link or smooth-scroll button
   - **Question**: Should it be a standard link `<a href="#top">` or JavaScript smooth scroll?
   - **Recommendation**: Standard link with GOV.UK styling (no JavaScript needed per KISS principle)

9. **Form Field Ordering**
   - **Issue**: Ticket doesn't specify exact order of form fields
   - **Question**: What order should fields appear in?
   - **Recommendation**: Follow logical order: Full name → Email → Employer → ID proof upload → Terms checkbox → Continue button

10. **Middleware Registration Order**
    - **Issue**: File upload middleware must be registered before route handlers in app.ts
    - **Question**: Where in the middleware chain should it be placed?
    - **Recommendation**: Register after other public pages routes but before error handlers, similar to manual-upload pattern
