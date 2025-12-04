# VIBE-228: Manage Media Account Requests - Approve Application

## Technical Approach

This feature extends the existing admin-pages module to handle media account request approvals. The implementation follows the established pattern in `libs/admin-pages` with route-based pages under `pages/media-applications/`. Database schema for `media_application` will be added to the main Prisma schema at `apps/postgres/prisma/schema.prisma` with fields for applicant details, status tracking, and Press ID file reference.

The approval workflow involves: (1) listing pending applications from the database, (2) displaying applicant details with file preview capability, (3) confirming approval via a yes/no radio form, and (4) showing success confirmation. File handling reuses the existing file upload infrastructure used in manual-upload, storing Press ID files temporarily and deleting them post-approval. Session storage will track multi-page form state during the confirmation flow.

Authorization restricts all pages to CTSC Admin users (USER_ROLES.INTERNAL_ADMIN_CTSC) using the existing requireRole middleware. The dashboard notification will query pending application counts on page load. Error handling covers database failures, missing files, and invalid application states with appropriate English and Welsh error messages.

## Implementation Details

### Database Schema
**File**: `apps/postgres/prisma/schema.prisma`
```prisma
model MediaApplication {
  id               String    @id @default(uuid()) @db.Uuid
  name             String    @db.VarChar(255)
  email            String    @db.VarChar(255)
  employer         String    @db.VarChar(255)
  proofOfIdPath    String?   @map("proof_of_id_path") @db.VarChar(500)
  status           String    @default("PENDING") @db.VarChar(20)
  appliedDate      DateTime  @default(now()) @map("applied_date")
  reviewedDate     DateTime? @map("reviewed_date")
  reviewedBy       String?   @map("reviewed_by") @db.VarChar(255)

  @@map("media_application")
}
```

### Module Structure
**Location**: `libs/admin-pages/src/`

```
media-application/
├── model.ts                          # TypeScript interfaces
├── queries.ts                        # Database queries
└── service.ts                        # Business logic (approval/rejection)

pages/
├── media-applications/
│   ├── index.ts                      # GET: List pending applications
│   └── index.njk                     # Template: Application table
├── media-applications/
│   └── [id]/
│       ├── index.ts                  # GET: Applicant details
│       ├── index.njk                 # Template: Details with approve/reject buttons
│       ├── approve.ts                # GET/POST: Confirmation form
│       ├── approve.njk               # Template: Yes/No radio form
│       ├── approved.ts               # GET: Success page
│       └── approved.njk              # Template: Success banner with details
```

### Page Routes
| Page | URL | Controller | Template |
|------|-----|------------|----------|
| List applications | `/media-applications` | `pages/media-applications/index.ts` | `index.njk` |
| Applicant details | `/media-applications/:id` | `pages/media-applications/[id]/index.ts` | `index.njk` |
| Approve confirmation | `/media-applications/:id/approve` | `pages/media-applications/[id]/approve.ts` | `approve.njk` |
| Approved success | `/media-applications/:id/approved` | `pages/media-applications/[id]/approved.ts` | `approved.njk` |

### Key Functions

**queries.ts**
- `getPendingApplications()` - Fetch all PENDING applications ordered by appliedDate
- `getApplicationById(id)` - Fetch single application with all details
- `updateApplicationStatus(id, status, reviewedBy)` - Update status and reviewed metadata
- `getPendingCount()` - Count of pending applications for dashboard notification

**service.ts**
- `approveApplication(id, reviewedBy)` - Approve application, delete file, update status
- `deleteProofOfIdFile(filePath)` - Remove file from temp storage

### Dashboard Integration
**File**: `libs/admin-pages/src/pages/admin-dashboard/index.ts`

Add notification box conditionally when pending applications exist:
```typescript
const pendingCount = await getPendingCount();
res.render("admin-dashboard/index", {
  pageTitle: lang.pageTitle,
  tiles,
  pendingCount,
  hideLanguageToggle: true
});
```

**File**: `libs/admin-pages/src/pages/admin-dashboard/index.njk`

Add notification box below page title:
```html
{% if pendingCount > 0 %}
<div class="govuk-notification-banner govuk-notification-banner--important">
  <div class="govuk-notification-banner__content">
    <p>{{ notificationText | replace("x", pendingCount) }}</p>
    <a href="/media-applications">{{ notificationLink }}</a>
  </div>
</div>
{% endif %}
```

### Authorization
All pages use: `requireRole([USER_ROLES.INTERNAL_ADMIN_CTSC])`

### File Handling
- Press ID files stored in temp directory (reuse existing upload infrastructure)
- `getApplicationById()` returns `proofOfIdPath` for file download link
- File links open in new tab via `target="_blank"` with `rel="noopener noreferrer"`
- `deleteProofOfIdFile()` removes file from filesystem after approval

## Error Handling & Edge Cases

### Validation
- Application ID must be valid UUID
- Application must exist in database
- Application status must be PENDING (prevent duplicate approvals)
- Radio selection (Yes/No) is mandatory on confirmation page
- File path must exist before displaying download link

### Error States
- **Database unavailable**: Display "Unable to load applicant details. Please try again later."
- **Application not found**: 404 with proper error page
- **File missing**: Show placeholder text "File not available" instead of link
- **No radio selected**: "Select yes or no before continuing."
- **Already approved/rejected**: Redirect to list with warning message
- **Invalid session state**: Clear session and redirect to list

### Security
- File paths sanitized to prevent directory traversal
- User authentication verified on all routes via requireRole middleware
- File downloads only permitted for authenticated CTSC admins
- SQL injection prevented via Prisma parameterized queries

### Accessibility
- All form fields have proper labels and error associations
- Tables use semantic HTML with scope attributes
- Success banners use `role="status"` for screen readers
- File links include `aria-label="Opens in new window"`
- Full keyboard navigation with visible focus states

## Acceptance Criteria Mapping

| AC | Implementation | Location |
|----|----------------|----------|
| 1 | Dashboard tile already exists, notification box added conditionally | `admin-dashboard/index.ts`, `admin-dashboard/index.njk` |
| 2 | Pending count query displays notification with link | `media-application/queries.ts` (getPendingCount) |
| 3 | Table displays pending applications with View links | `media-applications/index.ts`, `index.njk` |
| 4 | Details page with file preview and action buttons | `media-applications/[id]/index.ts`, `index.njk` |
| 5 | Confirmation page with radio form and applicant details | `media-applications/[id]/approve.ts`, `approve.njk` |
| 6 | Success page with banner and next steps message | `media-applications/[id]/approved.ts`, `approved.njk` |
| 7 | Reject flow placeholder (future iteration) | Reject button links to `/media-applications/:id/reject` (not implemented) |
| 8 | Back links on all pages using GOV.UK pattern | All templates extend base-template with back link support |

## CLARIFICATIONS NEEDED

1. **Email Notifications**: Ticket mentions "applicant will be notified to confirm their details" - should this be implemented now or in a future iteration? If now, what email service/template should be used?

2. **File Storage Location**: Where exactly is the "temp folder" for Press ID files? Is it the same location as manual-upload files? Should we use Azure Blob Storage or local filesystem?

3. **Existing Account Check**: Success message says "If an account already exists, the applicant will be asked to sign in" - is there existing logic to check for duplicate accounts by email before creating?

4. **User Account Creation**: Does approving an application automatically create a User record in the database, or is that handled by a separate system after the applicant confirms their details?

5. **Audit Logging**: Should approval actions be logged in an audit table, or is the reviewedBy/reviewedDate field sufficient?

6. **Search/Filter**: Should the pending applications table support search/filter by name or employer, or is simple date-ordered listing sufficient for v1?

7. **Reject Workflow**: Should the Reject button be disabled/hidden for now, or link to a placeholder page with "Coming soon" message?

8. **File Upload Process**: How do applicants upload Press ID files during account creation? Is that part of a separate ticket (the "create media application" flow mentioned in pre-conditions)?

9. **Pagination**: Should the pending applications list support pagination if there are many applications, or load all at once?
