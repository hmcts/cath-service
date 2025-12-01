# VIBE-229 Technical Specification: Manage Media Account Requests - Reject Application

## Overview

This specification details the implementation of a multi-page flow for CTSC Admins to review and reject media account applications in the Courts and Tribunals Hearings (CaTH) service.

## User Stories

**As a** CTSC Admin
**I want to** review pending media account applications
**So that** I can reject applications that don't meet requirements

**As a** CTSC Admin
**I want to** see all application details including proof of ID
**So that** I can make informed decisions about rejections

**As a** CTSC Admin
**I want to** select rejection reasons
**So that** applicants understand why their application was rejected

## Page Flow

```
/admin/dashboard
    ↓
/admin/media-requests (list of pending applications)
    ↓
/admin/media-requests/{id} (application details)
    ↓
/admin/media-requests/{id}/reject (select rejection reasons)
    ↓
/admin/media-requests/{id}/reject/confirm (confirmation page)
    ↓
/admin/media-requests/{id}/reject/complete (success banner)
    ↓ (redirects to)
/admin/media-requests (list view)
```

## Page Specifications

### 1. Admin Dashboard (/admin/dashboard)

**Purpose**: Entry point for CTSC Admins to access media application management

**Content**:
- Existing page - update to show "Manage Media Account Requests" tile
- Important notification box (blue background) showing count of outstanding requests
- Tile links to `/admin/media-requests`

**Notification Box**:
- English: "You have {count} outstanding media account request(s)"
- Welsh: "Mae gennych {count} cais(iadau) cyfrif cyfryngau yn yr arfaeth"
- Only show if count > 0
- Blue background (govuk-notification-banner--info)

**Updates Required**:
- Add query to count pending applications
- Conditionally render notification box
- Tile already exists in admin dashboard

**Access Control**: INTERNAL_ADMIN_CTSC, SYSTEM_ADMIN

---

### 2. Media Requests List (/admin/media-requests)

**Purpose**: Display all pending media account applications

**Content**:
- Page title: "Manage media account requests"
- Welsh: "Rheoli ceisiadau cyfrif cyfryngau"
- If no pending applications: "There are no pending media account requests"
- Welsh: "Nid oes ceisiadau cyfrif cyfryngau yn yr arfaeth"
- Table showing pending applications with columns:
  - Name (applicant full name)
  - Email
  - Employer
  - Date applied (format: "16 Jan 2025")
  - Action link: "View application"

**Table Structure**:
```html
<table class="govuk-table">
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>Employer</th>
      <th>Date applied</th>
      <th>Action</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>John Smith</td>
      <td>john.smith@example.com</td>
      <td>BBC News</td>
      <td>16 Jan 2025</td>
      <td><a href="/admin/media-requests/{id}">View application</a></td>
    </tr>
  </tbody>
</table>
```

**Sorting**: Default order by date applied (oldest first)

**Access Control**: INTERNAL_ADMIN_CTSC, SYSTEM_ADMIN

**Accessibility**:
- Table caption for screen readers
- Proper header scope attributes
- Action link has context (includes applicant name in aria-label)

---

### 3. Application Details (/admin/media-requests/{id})

**Purpose**: Display full details of a specific media account application

**Content**:
- Page title: "Media account request from {applicant name}"
- Welsh: "Cais cyfrif cyfryngau gan {applicant name}"
- Back link to `/admin/media-requests`
- Summary list showing:
  - Full name
  - Email address
  - Employer
  - Date applied (format: "16 January 2025")
  - Proof of ID (file download link with file size)
- Two action buttons:
  - Primary: "Accept application" (green button, links to accept flow - future ticket)
  - Secondary: "Reject application" (red button, links to `/admin/media-requests/{id}/reject`)

**Summary List Structure**:
```html
<dl class="govuk-summary-list">
  <div class="govuk-summary-list__row">
    <dt class="govuk-summary-list__key">Full name</dt>
    <dd class="govuk-summary-list__value">John Smith</dd>
  </div>
  <div class="govuk-summary-list__row">
    <dt class="govuk-summary-list__key">Email address</dt>
    <dd class="govuk-summary-list__value">john.smith@example.com</dd>
  </div>
  <div class="govuk-summary-list__row">
    <dt class="govuk-summary-list__key">Employer</dt>
    <dd class="govuk-summary-list__value">BBC News</dd>
  </div>
  <div class="govuk-summary-list__row">
    <dt class="govuk-summary-list__key">Date applied</dt>
    <dd class="govuk-summary-list__value">16 January 2025</dd>
  </div>
  <div class="govuk-summary-list__row">
    <dt class="govuk-summary-list__key">Proof of ID</dt>
    <dd class="govuk-summary-list__value">
      <a href="/admin/media-requests/{id}/download-proof" download>
        press_id.pdf (245 KB)
      </a>
    </dd>
  </div>
</dl>
```

**Error Handling**:
- If application not found (404): Show error page "Application not found"
- If application already processed: Show error page "This application has already been processed"
- If proof of ID file missing: Show "(File not available)" instead of download link

**Access Control**: INTERNAL_ADMIN_CTSC, SYSTEM_ADMIN

**Accessibility**:
- Red button has aria-describedby linking to warning about rejection being permanent
- Download link includes file size and type for screen reader users

---

### 4. Reject Application - Select Reasons (/admin/media-requests/{id}/reject)

**Purpose**: Allow admin to select one or more rejection reasons

**Content**:
- Page title: "Why are you rejecting this application?"
- Welsh: "Pam ydych chi'n gwrthod y cais hwn?"
- Back link to `/admin/media-requests/{id}`
- Applicant name shown in context: "Media account request from {applicant name}"
- Checkbox group with rejection reasons (multiple selection allowed)
- Continue button

**Rejection Reasons** (checkboxes):
1. "Proof of ID not valid" / "Prawf adnabyddiaeth ddim yn ddilys"
2. "Proof of ID expired" / "Prawf adnabyddiaeth wedi dod i ben"
3. "Not a media organization" / "Nid sefydliad cyfryngau"
4. "Duplicate application" / "Cais dyblyg"
5. "Other" with text area for additional details / "Arall"

**Validation Rules**:
- At least one reason must be selected
- If "Other" is selected, text area must not be empty
- Text area max length: 500 characters

**Error Messages**:
- No reason selected: "Select at least one reason for rejection"
- Welsh: "Dewiswch o leiaf un rheswm dros wrthod"
- Other selected but no text: "Enter details for 'Other' reason"
- Welsh: "Rhowch fanylion ar gyfer rheswm 'Arall'"

**Form Structure**:
```html
<form method="post" novalidate>
  {{ govukCheckboxes({
    name: "rejectionReasons",
    fieldset: {
      legend: {
        text: "Select all reasons that apply",
        classes: "govuk-fieldset__legend--m"
      }
    },
    items: [
      { value: "invalid_id", text: "Proof of ID not valid" },
      { value: "expired_id", text: "Proof of ID expired" },
      { value: "not_media", text: "Not a media organization" },
      { value: "duplicate", text: "Duplicate application" },
      {
        value: "other",
        text: "Other",
        conditional: {
          html: govukTextarea({
            name: "otherReason",
            label: { text: "Provide details" },
            maxlength: 500
          })
        }
      }
    ]
  }) }}

  {{ govukButton({ text: "Continue" }) }}
</form>
```

**Access Control**: INTERNAL_ADMIN_CTSC, SYSTEM_ADMIN

**Accessibility**:
- Conditional reveal for "Other" text area
- Character count component for text area
- Error summary at top of page if validation fails

---

### 5. Reject Application - Confirm (/admin/media-requests/{id}/reject/confirm)

**Purpose**: Confirm rejection before final action

**Content**:
- Page title: "Check your answers before rejecting this application"
- Welsh: "Gwiriwch eich atebion cyn gwrthod y cais hwn"
- Back link to `/admin/media-requests/{id}/reject`
- Warning text: "This action cannot be undone"
- Summary list showing:
  - Applicant name
  - Email
  - Employer
  - Selected rejection reasons
- Radio buttons: "Are you sure you want to reject this application?"
  - Yes
  - No
- Continue button

**Summary List Structure**:
```html
<dl class="govuk-summary-list">
  <div class="govuk-summary-list__row">
    <dt class="govuk-summary-list__key">Applicant</dt>
    <dd class="govuk-summary-list__value">John Smith</dd>
    <dd class="govuk-summary-list__actions">
      <a href="/admin/media-requests/{id}">View details</a>
    </dd>
  </div>
  <div class="govuk-summary-list__row">
    <dt class="govuk-summary-list__key">Email</dt>
    <dd class="govuk-summary-list__value">john.smith@example.com</dd>
  </div>
  <div class="govuk-summary-list__row">
    <dt class="govuk-summary-list__key">Employer</dt>
    <dd class="govuk-summary-list__value">BBC News</dd>
  </div>
  <div class="govuk-summary-list__row">
    <dt class="govuk-summary-list__key">Rejection reasons</dt>
    <dd class="govuk-summary-list__value">
      <ul class="govuk-list govuk-list--bullet">
        <li>Proof of ID not valid</li>
        <li>Not a media organization</li>
      </ul>
    </dd>
    <dd class="govuk-summary-list__actions">
      <a href="/admin/media-requests/{id}/reject">Change</a>
    </dd>
  </div>
</dl>
```

**Validation Rules**:
- Radio button must be selected
- Error message: "Select yes if you want to reject this application"
- Welsh: "Dewiswch 'ie' os ydych am wrthod y cais hwn"

**Actions**:
- If "Yes": Process rejection and redirect to complete page
- If "No": Redirect back to application details page

**Access Control**: INTERNAL_ADMIN_CTSC, SYSTEM_ADMIN

**Accessibility**:
- Warning text uses govuk-warning-text component with icon
- Radio buttons inline layout

---

### 6. Reject Application - Complete (/admin/media-requests/{id}/reject/complete)

**Purpose**: Confirm successful rejection and provide next steps

**Content**:
- Success banner (green): "Account request has been rejected"
- Welsh: "Mae'r cais cyfrif wedi cael ei wrthod"
- Body text: "An email has been sent to {applicant email} informing them of the rejection."
- Welsh: "Mae e-bost wedi'i anfon at {applicant email} yn eu hysbysu am y gwrthodiad."
- Next steps heading: "What happens next"
- Welsh: "Beth sy'n digwydd nesaf"
- Next steps text: "The applicant will receive an email with details of why their application was rejected. They can submit a new application if they wish."
- Links:
  - "View pending applications" (back to media requests list)
  - "Return to admin dashboard"

**Success Banner Structure**:
```html
<div class="govuk-panel govuk-panel--confirmation">
  <h1 class="govuk-panel__title">Account request has been rejected</h1>
</div>
```

**Auto-redirect**: After 3 seconds, automatically redirect to `/admin/media-requests` (with JS enabled)

**Access Control**: INTERNAL_ADMIN_CTSC, SYSTEM_ADMIN

**Accessibility**:
- Success banner uses panel component
- Auto-redirect announced to screen readers
- Manual links available for users who disable JS

---

## Database Schema

### media_application Table

```prisma
model MediaApplication {
  id                 String   @id @default(cuid())
  fullName           String   @map("full_name")
  email              String   @unique
  employer           String
  proofOfIdFileName  String?  @map("proof_of_id_file_name")
  proofOfIdFileSize  Int?     @map("proof_of_id_file_size")
  proofOfIdMimeType  String?  @map("proof_of_id_mime_type")
  status             ApplicationStatus @default(PENDING)
  rejectionReasons   String[] @map("rejection_reasons")
  rejectionOther     String?  @map("rejection_other")
  createdAt          DateTime @default(now()) @map("created_at")
  processedAt        DateTime? @map("processed_at")
  processedBy        String?  @map("processed_by") @db.Uuid

  @@index([status])
  @@index([createdAt])
  @@map("media_application")
}

enum ApplicationStatus {
  PENDING
  APPROVED
  REJECTED

  @@map("application_status")
}
```

**Field Descriptions**:
- `id`: Unique identifier (CUID)
- `fullName`: Applicant's full name
- `email`: Applicant's email address (unique)
- `employer`: Media organization name
- `proofOfIdFileName`: Original filename of uploaded proof
- `proofOfIdFileSize`: File size in bytes
- `proofOfIdMimeType`: MIME type of uploaded file
- `status`: Current application status (PENDING, APPROVED, REJECTED)
- `rejectionReasons`: Array of reason codes (invalid_id, expired_id, not_media, duplicate, other)
- `rejectionOther`: Free text if "other" reason selected
- `createdAt`: Timestamp of application submission
- `processedAt`: Timestamp when application was approved/rejected
- `processedBy`: User ID of admin who processed the application

---

## File Storage

### Temporary Storage for Proof of ID Files

**Location**: `/tmp/media-applications/{application-id}/`

**File Naming Convention**: `{application-id}_{originalFileName}`

**Storage Approach**:
- Files uploaded during application creation stored in temp folder
- Files retained for 30 days after application processed
- Cleanup job runs nightly to delete old files
- Alternative: Use Azure Blob Storage with temp container

**File Access**:
- Download endpoint: `/admin/media-requests/{id}/download-proof`
- Only accessible to CTSC Admins
- File streamed directly to browser
- Proper content-type and content-disposition headers set

**Security**:
- Validate user has permission before serving file
- Validate application exists and belongs to correct ID
- No directory traversal possible
- File size limit: 5MB during upload

---

## Email Notifications

### Gov.Notify Integration

**Template ID**: TBD (to be configured in Gov.Notify)

**Email Details**:
- **To**: Applicant email address
- **Subject**: "Media account application - Decision"
- **Template Variables**:
  - `applicant_name`: Full name
  - `rejection_reasons`: Formatted list of reasons
  - `service_name`: "Courts and Tribunals Hearings"
  - `contact_email`: "cath-support@justice.gov.uk"

**Email Content** (English):
```
Dear ((applicant_name)),

Your application for a media account on the Courts and Tribunals Hearings service has been rejected.

Reason(s) for rejection:
((rejection_reasons))

If you believe this decision is incorrect, please contact us at ((contact_email)).

You can submit a new application if you have additional information to provide.

Regards,
HMCTS Courts and Tribunals Hearings Team
```

**Email Content** (Welsh):
```
Annwyl ((applicant_name)),

Mae eich cais am gyfrif cyfryngau ar y gwasanaeth Gwrandawiadau Llysoedd a Thribiwnlysoedd wedi cael ei wrthod.

Rheswm(au) dros wrthod:
((rejection_reasons))

Os ydych chi'n credu bod y penderfyniad hwn yn anghywir, cysylltwch â ni yn ((contact_email)).

Gallwch gyflwyno cais newydd os oes gennych wybodaeth ychwanegol i'w darparu.

Yn gywir,
Tîm Gwrandawiadau Llysoedd a Thribiwnlysoedd GLlTEF
```

**Error Handling**:
- If email send fails, log error but complete rejection
- Admin sees warning: "Application rejected but email notification failed"
- Retry mechanism: Queue failed emails for retry (3 attempts)

---

## Form Validation

### Common Validation Rules

**Application ID Validation**:
- Must be valid CUID format
- Application must exist in database
- Application status must be PENDING

**Session Validation**:
- User must be authenticated
- User must have CTSC Admin or System Admin role

### Page-Specific Validation

**Select Rejection Reasons Page**:
1. At least one reason must be selected
2. If "other" selected, `otherReason` field required
3. `otherReason` max length: 500 characters
4. `otherReason` must not contain only whitespace

**Confirm Rejection Page**:
1. Confirmation radio must be selected ("yes" or "no")
2. Session must contain rejection reasons from previous step
3. Application must still be PENDING (not processed by another admin)

---

## Error Handling

### Error Scenarios

**Application Not Found (404)**:
- Title: "Application not found"
- Message: "The application you're looking for could not be found. It may have been deleted or the link may be incorrect."
- Action: Link back to media requests list

**Application Already Processed**:
- Title: "Application already processed"
- Message: "This application has already been {status} by another administrator on {date}."
- Action: Link back to media requests list

**Unauthorized Access (403)**:
- Title: "You do not have permission"
- Message: "You need CTSC Admin permissions to access this page."
- Action: Link back to dashboard

**File Not Found**:
- Don't error - show "(File not available)" in UI
- Log warning for investigation

**Database Error**:
- Title: "Something went wrong"
- Message: "There was a problem processing your request. Please try again later."
- Action: Link back to previous page
- Log full error details

**Email Send Failure**:
- Complete rejection process
- Show warning banner: "Application rejected successfully, but email notification failed to send. The applicant may need to be contacted manually."
- Log error with application ID for follow-up

---

## Accessibility Requirements (WCAG 2.2 AA)

### General Requirements
- All pages must pass axe-core automated tests
- Keyboard navigation fully functional (tab order logical)
- Screen reader compatible (tested with NVDA/JAWS)
- Color contrast ratio minimum 4.5:1 for text
- Focus indicators visible on all interactive elements

### Component-Specific Requirements

**Tables**:
- `<th scope="col">` for column headers
- `<caption>` for table description (can be visually hidden)
- Row headers where appropriate

**Forms**:
- Labels properly associated with inputs
- Error summary at top of page with links to errors
- Individual field errors with id references
- Required fields indicated (not by color alone)

**Links**:
- Descriptive link text (avoid "click here")
- Context provided for screen readers (aria-label where needed)
- Visually distinct from surrounding text

**Buttons**:
- Clear purpose from text alone
- Sufficient size (minimum 44x44px touch target)
- Not reliant on color alone for meaning

**Navigation**:
- Back links on all pages
- Breadcrumbs or clear navigation path
- Skip to main content link

---

## Security Requirements

### Authentication & Authorization
- All routes require authentication
- User must have INTERNAL_ADMIN_CTSC or SYSTEM_ADMIN role
- Check role on every request (not just client-side)

### Input Validation
- Sanitize all user input
- Validate application ID format (CUID)
- Validate rejection reasons against allowed list
- Limit text area input to prevent DOS

### File Security
- Validate file exists before download
- Check user permission before serving file
- Prevent directory traversal attacks
- Set appropriate Content-Type headers
- Implement rate limiting on download endpoint

### Data Protection
- Log all rejection actions with user ID and timestamp
- Don't expose sensitive data in error messages
- Use parameterized queries (Prisma handles this)
- HTTPS only (enforced by helmet)

### CSRF Protection
- Express session already includes CSRF protection
- Form submissions require valid session

---

## Welsh Language Support

### Content Structure
- All page content in both English and Welsh
- Controllers pass both `en` and `cy` objects to templates
- i18n middleware selects correct language based on `?lng=cy` parameter
- Language toggle on all pages (except where explicitly hidden)

### Translation Requirements
- All static content translated
- Error messages translated
- Email notifications translated
- Form labels and hints translated
- Button text translated

### Testing Welsh Content
- Test all pages with `?lng=cy` query parameter
- Verify proper character encoding (UTF-8)
- Verify Welsh characters display correctly
- Test with Welsh screen reader if possible

---

## Performance Considerations

### Database Queries
- Index on `media_application.status` for fast pending query
- Index on `media_application.createdAt` for sorting
- Use select to only fetch needed fields
- Consider pagination if application list grows large

### File Downloads
- Stream files directly (don't load into memory)
- Set appropriate cache headers
- Consider CDN for static assets

### Email Sending
- Send emails asynchronously (don't block request)
- Use queue for retry mechanism
- Set reasonable timeout (5 seconds)

### Caching
- Cache Gov.Notify template content
- Cache user role lookups (session duration)
- Don't cache application data (needs to be current)

---

## Testing Strategy

### Unit Tests
- Service functions (rejection logic)
- Validation functions
- Email formatting functions
- File path utilities

### Integration Tests
- Database queries (using test database)
- File storage operations
- Email sending (mock Gov.Notify client)

### E2E Tests (Playwright)
- Complete rejection flow (happy path)
- Error scenarios (application not found, already processed)
- Form validation errors
- File download
- Welsh language switching
- Accessibility tests (axe-core)

### Manual Testing
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Screen reader testing (NVDA on Windows)
- Keyboard navigation
- Mobile responsiveness
- Print styles

---

## Monitoring & Logging

### Logging Requirements
- Log all rejection actions (INFO level):
  - Application ID
  - Admin user ID
  - Timestamp
  - Rejection reasons
- Log email send failures (ERROR level)
- Log file access (INFO level)
- Log authentication failures (WARN level)

### Metrics to Track
- Number of applications rejected per day
- Average time from application to rejection
- Email send success rate
- Most common rejection reasons
- Page load times

### Alerts
- Alert if email send failure rate exceeds 5%
- Alert if file downloads fail repeatedly
- Alert if database queries timeout

---

## Deployment Considerations

### Environment Variables
- `GOV_NOTIFY_API_KEY`: API key for Gov.Notify service
- `GOV_NOTIFY_REJECTION_TEMPLATE_ID`: Template ID for rejection emails
- `MEDIA_FILES_PATH`: Base path for temp file storage (default: `/tmp/media-applications`)
- `MEDIA_FILES_RETENTION_DAYS`: Days to retain files after processing (default: 30)

### Database Migrations
- Run migration to create `media_application` table
- Run migration to create `application_status` enum
- Ensure indexes are created

### Gov.Notify Setup
1. Create email template in Gov.Notify dashboard
2. Configure template with required variables
3. Test template with sample data
4. Add template ID to environment config

### File Storage Setup
- Ensure temp directory exists and is writable
- Set up cleanup cron job for old files
- Consider Azure Blob Storage for production

---

## Future Enhancements (Out of Scope)

- Accept application flow (separate ticket)
- Email applicant for more information
- Bulk reject multiple applications
- Export list of applications to CSV
- Application search and filtering
- Application audit trail / history
- Automated rejection for duplicate emails
- Integration with identity verification service

---

## Dependencies

### External Services
- Gov.Notify API (email notifications)
- Azure Blob Storage (optional, for file storage)

### Internal Libraries
- `@hmcts/auth` - Authentication and authorization
- `@hmcts/web-core` - GOV.UK Frontend components
- `@hmcts/postgres` - Database access (Prisma)
- `@hmcts/simple-router` - File-based routing

### NPM Packages
- `multer` - File upload handling
- `notifications-node-client` - Gov.Notify client (needs to be added)

---

## Acceptance Criteria

### Functional Requirements
- [ ] CTSC Admin can view list of pending media applications
- [ ] CTSC Admin can view full details of individual application
- [ ] CTSC Admin can download proof of ID file
- [ ] CTSC Admin can select multiple rejection reasons
- [ ] CTSC Admin can provide additional details for "other" reason
- [ ] CTSC Admin can confirm rejection before processing
- [ ] Application status updated to REJECTED in database
- [ ] Proof of ID file deleted after rejection
- [ ] Rejection email sent to applicant via Gov.Notify
- [ ] Admin dashboard shows count of pending applications

### Non-Functional Requirements
- [ ] All pages support Welsh language
- [ ] All pages pass WCAG 2.2 AA compliance
- [ ] All pages work without JavaScript
- [ ] All pages tested with screen reader
- [ ] All pages tested on mobile devices
- [ ] Form validation provides helpful error messages
- [ ] Error scenarios handled gracefully
- [ ] All actions logged for audit trail
- [ ] Email failures logged and queued for retry
- [ ] Performance: Page load time < 2 seconds
- [ ] Security: Only CTSC Admins can access pages
- [ ] Security: File downloads properly restricted

### Test Coverage
- [ ] Unit tests for all service functions (>80% coverage)
- [ ] Integration tests for database operations
- [ ] E2E tests for complete rejection flow
- [ ] E2E tests for error scenarios
- [ ] Accessibility tests with axe-core
- [ ] Welsh language content verified

---

## Definition of Done

- [ ] All code merged to master branch
- [ ] All tests passing (unit, integration, E2E)
- [ ] Code review completed and approved
- [ ] Accessibility audit passed
- [ ] Welsh translations reviewed by Welsh speaker
- [ ] Documentation updated
- [ ] Database migrations tested
- [ ] Gov.Notify template created and tested
- [ ] Deployed to staging environment
- [ ] Manual testing completed on staging
- [ ] Product Owner acceptance
- [ ] Deployed to production

---

## References

- GOV.UK Design System: https://design-system.service.gov.uk/
- WCAG 2.2 Guidelines: https://www.w3.org/WAI/WCAG22/quickref/
- Gov.Notify Documentation: https://docs.notifications.service.gov.uk/
- HMCTS Service Standard: https://hmcts.github.io/
