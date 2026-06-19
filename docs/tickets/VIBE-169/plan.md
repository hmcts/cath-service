# VIBE-169: Remove Publication - Technical Implementation Plan

## 1. Technical Approach

This feature implements a multi-step admin flow for removing publications from the CaTH system. The implementation follows the existing patterns established in the manual-upload feature, utilizing the same architectural approach with separate pages for each step in the user journey.

### Key Design Decisions

1. **Module Location**: Implement as a sub-feature within `libs/admin-pages` to maintain consistency with other admin features like manual-upload
2. **Page Structure**: Create separate page controllers and templates for each step following the existing page pattern
3. **Data Storage**: Use Redis session storage for temporary form data between steps (consistent with manual-upload)
4. **Database Operations**: Use Prisma to query and delete artefacts from the database
5. **Autocomplete**: Reuse existing court search autocomplete functionality from `@hmcts/web-core`

## 2. Implementation Details

### 2.1 URL Structure and Page Organization

Create new pages in `libs/admin-pages/src/pages/`:

| Page | URL Path | Purpose |
|------|----------|---------|
| remove-list | `/remove-list` | Landing page (redirects to find) |
| remove-list-find | `/remove-list/find` | Search for court/tribunal |
| remove-list-select | `/remove-list/select` | Select publications to remove |
| remove-list-confirm | `/remove-list/confirm` | Confirm removal |
| remove-list-success | `/remove-list/success` | Success confirmation |

### 2.2 File Structure

```
libs/admin-pages/src/pages/
├── remove-list/
│   ├── index.ts           # Landing page controller (redirects to find)
│   ├── index.njk          # Landing page template (minimal)
│   ├── en.ts              # English content
│   └── cy.ts              # Welsh content
├── remove-list-find/
│   ├── index.ts           # Search page controller
│   ├── index.njk          # Search page template with autocomplete
│   ├── en.ts              # English content
│   └── cy.ts              # Welsh content
├── remove-list-select/
│   ├── index.ts           # Selection page controller
│   ├── index.njk          # Selection page with table and checkboxes
│   ├── en.ts              # English content
│   └── cy.ts              # Welsh content
├── remove-list-confirm/
│   ├── index.ts           # Confirmation page controller
│   ├── index.njk          # Confirmation page with radio buttons
│   ├── en.ts              # English content
│   └── cy.ts              # Welsh content
└── remove-list-success/
    ├── index.ts           # Success page controller
    ├── index.njk          # Success page template
    ├── en.ts              # English content
    └── cy.ts              # Welsh content
```

### 2.3 Data Flow and Session Management

Use Redis session storage pattern (similar to manual-upload):

```typescript
// Session data structure
interface RemovalSessionData {
  locationId: string;
  locationName: string;
  selectedArtefacts: string[]; // Array of artefact IDs
}

// Store in session
req.session.removalData = { ... };

// Clear after successful removal
delete req.session.removalData;
```

### 2.4 Repository Functions

Add to `libs/publication/src/repository/queries.ts`:

```typescript
// Get artefacts by location
export async function getArtefactsByLocation(locationId: string): Promise<Artefact[]>

// Delete artefacts by IDs
export async function deleteArtefacts(artefactIds: string[]): Promise<void>

// Get artefacts by IDs (for confirmation page)
export async function getArtefactsByIds(artefactIds: string[]): Promise<Artefact[]>
```

### 2.5 Authentication & Authorization

Apply role-based access control to all pages:
- Required roles: `SYSTEM_ADMIN`, `INTERNAL_ADMIN_CTSC`, `INTERNAL_ADMIN_LOCAL`
- Use `requireRole` middleware (same as manual-upload)

### 2.6 Validation Logic

Create validation utilities in pages or reuse patterns:

1. **Find Page Validation**:
   - Location field required
   - Minimum 3 characters (handled by autocomplete)
   - Must match existing location from Court Master Reference Data

2. **Select Page Validation**:
   - At least one artefact must be selected
   - Selected artefacts must exist and belong to the chosen location

3. **Confirm Page Validation**:
   - Radio button selection required (Yes/No)
   - Session data must exist

### 2.7 Error Handling

Follow GOV.UK Design System error patterns:

1. **Validation Errors**: Display inline with error summary at top
2. **Database Errors**: Catch and display generic error message
3. **Session Errors**: Redirect to find page if session data missing
4. **Not Found**: Display appropriate error if location has no artefacts

## 3. Error Handling & Edge Cases

### Edge Cases

1. **No Results Found**: Display message "No publications found for this location"
2. **Session Timeout**: Redirect to find page with message to start again
3. **Artefact Already Deleted**: Handle gracefully, only delete existing ones
4. **Database Connection Failure**: Display error and allow retry
5. **Multiple Simultaneous Deletions**: Prisma transactions will handle consistency

### Error Messages

Implement bilingual error messages in page content files:

- Search validation errors
- Selection validation errors
- Database operation errors
- Session timeout errors

## 4. Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| Admin sees 'Remove' tab | Already exists in dashboard (line 24 of admin-dashboard/index.njk) |
| Remove tab message | Content in admin-dashboard en.ts/cy.ts (already present) |
| Find content to remove page | `/remove-list/find` with autocomplete |
| Search validation | Validate minimum 3 chars, display GOV.UK error summary |
| Autocomplete suggestions | Reuse existing `search-autocomplete.ts` functionality |
| Select content page | `/remove-list/select` with table and checkboxes |
| Table with details | Display artefact data: list type, court name, dates, language, sensitivity |
| Confirmation page | `/remove-list/confirm` with radio buttons and selected items |
| Cancel returns to select | Redirect back to select page on "No" |
| Success banner | Green success banner on `/remove-list/success` |
| Links on success page | "Remove another file" and "Home" links |
| Welsh support | Full bilingual support via en.ts/cy.ts files |
| Accessibility | GOV.UK Design System compliance, WCAG 2.2 AA |

## 5. Database Schema

No changes required. Use existing `Artefact` model:

```prisma
model Artefact {
  artefactId        String   @id @default(uuid()) @map("artefact_id") @db.Uuid
  locationId        String   @map("location_id")
  listTypeId        Int      @map("list_type_id")
  contentDate       DateTime @map("content_date") @db.Date
  sensitivity       String
  language          String
  displayFrom       DateTime @map("display_from")
  displayTo         DateTime @map("display_to")
  lastReceivedDate  DateTime @default(now()) @map("last_received_date")

  @@map("artefact")
}
```

## 6. Testing Strategy

### Unit Tests

- Validation functions
- Repository query functions
- Content rendering with correct language
- Session data management

### E2E Tests (Playwright)

Test file: `e2e-tests/tests/remove-publication.spec.ts`

Scenarios:
1. Complete removal flow (happy path)
2. Validation errors on find page
3. No results found for location
4. Selection validation (no checkboxes selected)
5. Cancel on confirmation page
6. Multiple artefacts removal
7. Language toggle functionality
8. Accessibility checks (axe-core)

### Test Data

Use existing test data patterns or create mock artefacts in test setup.

## 7. Open Questions & Clarifications Needed

### CLARIFICATIONS NEEDED

1. **Soft Delete vs Hard Delete**: Should artefacts be permanently deleted or soft-deleted with a flag?
   - **Recommendation**: Hard delete for now (matching ticket requirements: "artefact must be removed from artefact table")
   - **Future**: Consider adding audit logging or soft delete if needed

2. **File Storage**: Should the actual files (stored in file storage) also be deleted?
   - **Recommendation**: Yes, delete both database record and file to maintain consistency
   - Need to add file deletion function to complement database deletion

3. **Audit Logging**: Should removal actions be logged with user ID, timestamp, artefact IDs?
   - **Recommendation**: Yes, add audit log entry for compliance and traceability
   - **Implementation**: Add audit log table and log all deletions

4. **GOV.UK Integration**: Does removal need to trigger GOV.UK unpublishing API?
   - **Recommendation**: Defer to future if no integration exists
   - **Note**: Ticket mentions "external facing service" but no API integration found in codebase

5. **Bulk Operations**: What's the maximum number of artefacts that can be removed at once?
   - **Recommendation**: No hard limit, but consider adding UI warning for large selections (>50)

6. **Role Permissions**: Should Local Admins only see their assigned locations?
   - **Current**: Manual upload doesn't filter by admin's assigned locations
   - **Recommendation**: Follow same pattern (show all locations) unless explicitly required

## 8. Implementation Notes

### Code Style Adherence

- Use ES modules with `.js` extensions for imports
- Use functional programming style (no classes unless needed for shared state)
- Follow YAGNI principle (no speculative features)
- Co-locate test files with source code
- Use camelCase for variables, PascalCase for types
- Use kebab-case for file/directory names

### Dependencies

No new dependencies required. Reuse existing:
- `@hmcts/auth` - Role-based access control
- `@hmcts/location` - Location data and search
- `@hmcts/publication` - Artefact repository functions (extend)
- `@hmcts/web-core` - Autocomplete, date formatting
- `@hmcts/postgres` - Database access via Prisma

### Performance Considerations

- Query artefacts with proper indexes on `locationId`
- Use Prisma transactions for multi-artefact deletion
- Session storage in Redis for temporary data (already configured)

### Security

- Validate all user inputs
- Use parameterized queries (Prisma handles this)
- Require authentication on all routes
- Check user has appropriate role
- Validate artefact ownership before deletion (locationId match)
