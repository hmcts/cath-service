# VIBE-229: Manage Media Account Requests - Reject Application

## Technical Approach

This feature extends the existing media application management functionality in `libs/admin-pages` to handle rejection of media account requests. The implementation mirrors the approval workflow established in VIBE-228, following the same architectural patterns and page structure.

The rejection workflow involves: (1) clicking "Reject application" from the applicant details page, (2) confirming rejection via a yes/no radio form, and (3) showing rejection confirmation. Unlike approval which deletes the Press ID file, rejection will retain the file temporarily to allow for potential review or appeal. The application status will be updated to REJECTED in the database.

Session storage will not be required as the rejection flow is simpler than approval (no multi-step process). Authorization restricts all pages to CTSC Admin users (USER_ROLES.INTERNAL_ADMIN_CTSC) using the existing requireRole middleware.

The rejection notification email will inform the applicant that their application was unsuccessful, maintaining the same email infrastructure used for approval notifications.

## Implementation Details

### Database Schema

**File**: `apps/postgres/prisma/schema.prisma`

No schema changes required - the `media_application` table already has:
- `status` field that supports "REJECTED" value (defined in `APPLICATION_STATUS` constant)
- `reviewedDate` field for tracking when rejection occurred
- `reviewedBy` field for tracking who rejected (future enhancement)

### Module Structure

**Location**: `libs/admin-pages/src/pages/media-applications/[id]/`

```
pages/media-applications/[id]/
├── reject.ts                      # GET/POST: Rejection confirmation form
├── reject.njk                     # Template: Yes/No radio form
├── reject-en.ts                   # English translations for reject page
├── reject-cy.ts                   # Welsh translations for reject page
├── rejected.ts                    # GET: Rejection success page
├── rejected.njk                   # Template: Rejection confirmation banner
├── rejected-en.ts                 # English translations for rejected page
└── rejected-cy.ts                 # Welsh translations for rejected page
```

### Page Routes

| Page | URL | Controller | Template |
|------|-----|------------|----------|
| Reject confirmation | `/media-applications/:id/reject` | `pages/media-applications/[id]/reject.ts` | `reject.njk` |
| Rejected success | `/media-applications/:id/rejected` | `pages/media-applications/[id]/rejected.ts` | `rejected.njk` |

### Key Functions

**service.ts** (add new function)
```typescript
export async function rejectApplication(id: string): Promise<void> {
  const application = await getApplicationById(id);

  if (!application) {
    throw new Error("Application not found");
  }

  if (application.status !== APPLICATION_STATUS.PENDING) {
    throw new Error("Application has already been reviewed");
  }

  await updateApplicationStatus(id, APPLICATION_STATUS.REJECTED);

  // Note: File is NOT deleted on rejection (kept for potential review/appeal)
}
```

### Notification Integration

**File**: `libs/notification/src/media-rejection-email.ts` (new file)

Similar pattern to `sendMediaApprovalEmail`:
```typescript
export async function sendMediaRejectionEmail(params: {
  name: string;
  email: string;
  employer: string;
}): Promise<void> {
  // Send email notification to applicant
  // Template should explain application was unsuccessful
  // Include contact information for queries
}
```

**Integration in reject.ts POST handler**:
```typescript
await rejectApplication(id);

// Send rejection email notification
try {
  await sendMediaRejectionEmail({
    name: application.name,
    email: application.email,
    employer: application.employer
  });
} catch (error) {
  console.error("❌ Failed to send rejection email:", error);
  // Don't fail the rejection if email fails
}

res.redirect(`/media-applications/${id}/rejected`);
```

## Error Handling & Edge Cases

### Validation
- Application ID must be valid UUID
- Application must exist in database
- Application status must be PENDING (prevent duplicate rejections)
- Radio selection (Yes/No) is mandatory on confirmation page

### Error States
- **Database unavailable**: Display "Unable to load applicant details. Please try again later."
- **Application not found**: 404 with proper error page
- **No radio selected**: "Select yes or no before continuing."
- **Already approved/rejected**: Redirect to list with warning message

### Security
- User authentication verified on all routes via requireRole middleware
- SQL injection prevented via Prisma parameterized queries
- File retention policy (files kept for rejected applications - different from approval)

### Accessibility
- All form fields have proper labels and error associations
- Tables use semantic HTML with scope attributes
- Success banners use `role="status"` for screen readers
- Full keyboard navigation with visible focus states
- Error summary component follows GOV.UK pattern

## Acceptance Criteria Mapping

| Requirement | Implementation | Location |
|-------------|----------------|----------|
| Click "Reject application" button | Already exists on details page, links to `/media-applications/:id/reject` | `media-applications/[id]/index.njk` |
| Confirmation page with yes/no radio | New page displaying applicant details and radio options | `reject.ts`, `reject.njk` |
| Update status to REJECTED | Service function calls updateApplicationStatus | `service.ts` (rejectApplication) |
| Success confirmation page | New page with rejection banner and next steps | `rejected.ts`, `rejected.njk` |
| Email notification to applicant | Send rejection email via notification service | `reject.ts` POST handler |
| Back links on all pages | Uses GOV.UK pattern from base template | All templates extend base-template |
| Welsh language support | Both en and cy translation files | `reject-en.ts`, `reject-cy.ts`, `rejected-en.ts`, `rejected-cy.ts` |

## Content Requirements

### Reject Confirmation Page (/media-applications/:id/reject)

**English (reject-en.ts)**:
- Page title: "Are you sure you want to reject this application?"
- Subheading: "Applicant's details"
- Radio options: "Yes" / "No"
- Button: "Continue"
- Error message: "Select yes or no before continuing."

**Welsh (reject-cy.ts)**:
- Page title: "A ydych yn siŵr eich bod am wrthod y cais hwn?"
- Subheading: "Manylion yr ymgeisydd"
- Radio options: "Ie" / "Na"
- Button: "Parhau"
- Error message: "Dewiswch ie neu na cyn parhau."

### Rejection Success Page (/media-applications/:id/rejected)

**English (rejected-en.ts)**:
- Banner: "Application has been rejected"
- Next steps heading: "What happens next"
- Message: "The applicant will be notified that their application was unsuccessful. They may contact CTSC if they have any questions about this decision."

**Welsh (rejected-cy.ts)**:
- Banner: "Mae'r cais wedi'i wrthod"
- Next steps heading: "Beth sy'n digwydd nesaf"
- Message: "Bydd yr ymgeisydd yn cael gwybod bod ei gais wedi bod yn aflwyddiannus. Gallant gysylltu â CTSC os oes ganddynt unrhyw gwestiynau am y penderfyniad hwn."

## Implementation Notes

1. **File Handling Difference**: Unlike approval which deletes the Press ID file, rejection keeps the file. This allows for potential appeals or review. A separate cleanup job may be needed to remove old rejected application files after a retention period.

2. **Consistent Patterns**: The reject flow mirrors the approve flow exactly in terms of:
   - Page structure and navigation
   - Validation and error handling
   - Authorization requirements
   - Translation approach

3. **Testing Requirements**:
   - Unit tests for `rejectApplication()` service function
   - Integration tests for reject.ts GET/POST handlers
   - E2E tests for complete rejection workflow
   - Accessibility tests for new pages

4. **Email Template**: The rejection email should be professional and empathetic, providing clear next steps if the applicant wishes to reapply or appeal the decision.

## CLARIFICATIONS NEEDED

1. **No Ticket File**: This plan is based on inferring requirements from the approval flow (VIBE-228) and the branch name. Please provide the actual ticket requirements if they differ from this approach.

2. **Email Content**: What should the rejection email contain? Should it:
   - Provide a reason field that admin can fill in?
   - Include information about reapplication process?
   - Provide contact details for appeals?

3. **File Retention**: How long should Press ID files be kept for rejected applications?
   - Should they be deleted immediately like approved applications?
   - Should they be retained for a specific period (e.g., 30 days)?
   - Is there a separate cleanup process?

4. **Rejection Reasons**: Should admins be able to provide a reason for rejection?
   - Free text field?
   - Predefined reasons (dropdown)?
   - Optional or mandatory?

5. **Reapplication Process**: Can rejected applicants reapply?
   - Same email address allowed to create new application?
   - Any waiting period before reapplication?

6. **Notification Service**: Does a `sendMediaRejectionEmail` function already exist in the notification module, or does it need to be created?

7. **Audit Logging**: Should rejection actions be logged separately from the reviewedDate field?
   - Admin user ID who performed rejection?
   - IP address or session information?
   - Rejection reason (if implemented)?

8. **Dashboard Impact**: Should the rejected applications:
   - Disappear from pending list immediately?
   - Be viewable in a separate "Rejected applications" section?
   - Affect the pending count in the dashboard notification?
