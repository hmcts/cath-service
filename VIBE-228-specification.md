# VIBE-228: Manage Media Account Requests - Approve Application

## Overview
This specification defines the approval flow for media account applications. CTSC Admin users review media applications and can approve them, creating user accounts and notifying applicants via email.

## Related Tickets
- **VIBE-229**: Rejection flow (shares dashboard, list page, and applicant details pages)
- **VIBE-227**: Media application form (creates applications)

## User Journey

### Prerequisites
- User must be authenticated as CTSC Admin
- Media application must exist in PENDING status
- Press ID file uploaded by applicant

### Flow Steps

1. **Dashboard** (`/admin/dashboard`)
   - Shows count of pending media applications
   - Links to media requests list
   - Shared with VIBE-229

2. **Media Requests List** (`/admin/media-requests`)
   - Displays all pending media applications
   - Shows applicant name, organization, submission date
   - Click to view details
   - Shared with VIBE-229

3. **Applicant Details** (`/admin/media-requests/{id}`)
   - Displays full application details
   - Shows Press ID file link
   - Two action buttons: "Approve" and "Reject"
   - Shared with VIBE-229

4. **Approval Confirmation** (`/admin/media-requests/{id}/approve`)
   - Page title: "Approve media account application"
   - Summary of applicant details (name, email, organization)
   - Radio buttons: "Yes, approve this application" / "No, go back"
   - Submit button
   - Back link to applicant details

5. **Approval Success** (`/admin/media-requests/{id}/approved`)
   - Green notification banner: "Application has been approved"
   - Summary of action taken
   - Links:
     - View media requests list
     - Return to dashboard

## Functional Requirements

### FR-1: Application Review
- CTSC Admin can view pending media applications
- Applications show applicant name, email, organization, Press ID file
- Press ID file can be downloaded for verification

### FR-2: Approval Confirmation
- Admin must confirm approval decision
- Page displays applicant summary for verification
- Can cancel and return to applicant details

### FR-3: User Account Creation
- Approved applications create user accounts
- User role: MEDIA
- User provenance: SSO
- Email must be validated and unique

### FR-4: Email Notification
- Approval email sent via Gov.Notify
- Contains login instructions
- Sent in applicant's preferred language (English/Welsh)

### FR-5: Database Updates
- Application status updated to APPROVED
- Approval timestamp recorded
- Press ID file deleted from temporary storage
- User record created in database

### FR-6: Audit Trail
- Record who approved application
- Timestamp of approval action
- Track approval email sent

## Non-Functional Requirements

### NFR-1: Accessibility
- WCAG 2.2 AA compliance
- Screen reader compatible
- Keyboard navigation
- Proper heading structure
- Error handling with accessible messages

### NFR-2: Welsh Language
- All pages support English and Welsh
- Language toggle available
- Email sent in applicant's language preference

### NFR-3: Security
- CTSC Admin authentication required
- Application ID validation
- File deletion secure
- Email addresses validated
- No sensitive data in logs

### NFR-4: Performance
- Page load under 2 seconds
- File deletion asynchronous
- Email sending non-blocking

### NFR-5: Error Handling
- Graceful handling of missing applications
- Handle duplicate user accounts
- Email sending failures logged
- File deletion failures handled

## Data Model

### MediaApplication
```
id: UUID (primary key)
firstName: String
surname: String
email: String
organization: String
pressIdFile: String (file path)
status: PENDING | APPROVED | REJECTED
submittedAt: DateTime
processedAt: DateTime?
processedBy: UUID? (admin user ID)
languagePreference: EN | CY
```

### User (created on approval)
```
userId: UUID
email: String
firstName: String
surname: String
userProvenance: SSO
userProvenanceId: String (email)
role: MEDIA
createdDate: DateTime
lastSignedInDate: DateTime?
```

## URL Structure

```
/admin/dashboard                         (shared with VIBE-229)
/admin/media-requests                    (shared with VIBE-229)
/admin/media-requests/{id}               (shared with VIBE-229)
/admin/media-requests/{id}/approve       (approval confirmation - GET/POST)
/admin/media-requests/{id}/approved      (success page - GET)
```

## Page Content Structure

### Approval Confirmation Page
**English:**
- Title: "Approve media account application"
- Heading: "Are you sure you want to approve this application?"
- Summary list of applicant details
- Radio options: "Yes, approve this application" / "No, go back"
- Button: "Continue"
- Back link: "Back to applicant details"

**Welsh:**
- Title: "Cymeradwyo cais am gyfrif y cyfryngau"
- Heading: "Ydych chi'n siŵr eich bod am gymeradwyo'r cais hwn?"
- Summary list of applicant details
- Radio options: "Iawn, cymeradwyo'r cais hwn" / "Na, mynd yn ôl"
- Button: "Parhau"
- Back link: "Nôl i fanylion yr ymgeisydd"

### Success Page
**English:**
- Green banner: "Application has been approved"
- Heading: "Application approved"
- Body: "The applicant has been sent an email with login instructions."
- Details: Applicant name, email, organization
- Links: "View all media requests" / "Return to dashboard"

**Welsh:**
- Green banner: "Mae'r cais wedi'i gymeradwyo"
- Heading: "Cais wedi'i gymeradwyo"
- Body: "Mae'r ymgeisydd wedi cael e-bost gyda chyfarwyddiadau mewngofnodi."
- Details: Applicant name, email, organization
- Links: "Gweld pob cais cyfryngau" / "Dychwelyd i'r dangosfwrdd"

## Email Template Requirements

### Gov.Notify Template
- Template name: "Media account approved"
- Personalisation fields:
  - `firstName`
  - `surname`
  - `loginUrl`
  - `serviceName`
- Available in English and Welsh
- Plain text and HTML versions

## Validation Rules

### Application Validation
- Application ID must be valid UUID
- Application must exist in database
- Application status must be PENDING
- Press ID file must exist

### User Creation Validation
- Email must be unique in user table
- Email format must be valid
- First name and surname required
- Organization name required

## Error Scenarios

### ES-1: Application Not Found
- Status: 404
- Message: "Application not found"
- Action: Redirect to media requests list

### ES-2: Application Already Processed
- Status: 400
- Message: "This application has already been processed"
- Action: Redirect to applicant details

### ES-3: Email Already Exists
- Status: 400
- Message: "A user with this email already exists"
- Action: Show error on confirmation page

### ES-4: File Deletion Failure
- Log error but don't block approval
- Send notification to admin team
- Continue with approval process

### ES-5: Email Send Failure
- Log error with details
- Mark application as approved
- Queue for retry or manual follow-up
- Show warning to admin

## Testing Requirements

### Unit Tests
- Application approval service logic
- User account creation
- File deletion handling
- Email sending mocking

### Integration Tests
- End-to-end approval flow
- Database transactions
- Gov.Notify integration
- File system operations

### E2E Tests (Playwright)
- Complete approval journey
- Error handling flows
- Welsh language version
- Accessibility checks (axe-core)

### Accessibility Tests
- Keyboard navigation
- Screen reader announcements
- Focus management
- Error message clarity
- Heading hierarchy

## Dependencies

### External Services
- Gov.Notify API (email sending)
- File storage system (temporary Press ID files)
- Azure AD (CTSC Admin authentication)

### Internal Modules
- `@hmcts/auth` - Admin authentication
- `@hmcts/postgres` - Database access
- GOV.UK Frontend - UI components
- GOV.UK Notify Node.js client

## Success Criteria

1. CTSC Admin can approve media applications
2. User accounts created successfully
3. Approval emails sent reliably
4. Press ID files deleted securely
5. All pages WCAG 2.2 AA compliant
6. Welsh translations complete and accurate
7. Error handling robust and user-friendly
8. Test coverage >80% on business logic
