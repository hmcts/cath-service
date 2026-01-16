# VIBE-310: Technical Implementation Plan

## Overview
This ticket implements a Blob Explorer feature for System Admin users to view publication metadata and manually trigger re-submission of publications to subscribers. The feature includes six pages navigating from a dashboard tile through location and publication browsing to a confirmation workflow.

## Summary
The Blob Explorer allows system administrators to browse publications by location, view detailed metadata for both JSON and flat file publications, and manually trigger subscription notifications for any publication. The implementation requires database queries for locations and publications, blob storage integration for file access, and a subscription notification service for re-submissions.

## Architecture

### Database Requirements
- Query locations (venues) with publication counts
- Query publications by location with metadata (artefact_id, list_type, display_from, display_to)
- Retrieve full publication metadata including:
  - Artefact ID, Location ID, Location Name
  - Publication Type, List Type, Provenance
  - Language, Sensitivity, Content Date
  - Display From/To dates

### Blob Storage Integration
- Access JSON publication content
- Access flat file publications (PDF, Word documents)
- Render JSON publications using templates
- Serve flat files (PDF pop-out, Word download)

### Subscription Service
- Trigger manual re-submission for a publication
- Send notifications to all subscribers of that publication
- Prevent duplicate submissions (POST/Redirect/GET pattern)

## Module Structure

Create new module: `libs/blob-explorer`

```
libs/blob-explorer/
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma          # If new tables needed
└── src/
    ├── index.ts               # Business logic exports
    ├── config.ts              # Module configuration
    ├── pages/
    │   ├── blob-explorer-locations.ts
    │   ├── blob-explorer-locations.njk
    │   ├── blob-explorer-publications.ts
    │   ├── blob-explorer-publications.njk
    │   ├── blob-explorer-json-file.ts
    │   ├── blob-explorer-json-file.njk
    │   ├── blob-explorer-flat-file.ts
    │   ├── blob-explorer-flat-file.njk
    │   ├── confirm-resubmission.ts
    │   ├── confirm-resubmission.njk
    │   ├── resubmission-success.ts
    │   └── resubmission-success.njk
    ├── services/
    │   ├── location-service.ts
    │   ├── publication-service.ts
    │   └── resubmission-service.ts
    └── locales/
        ├── en.ts
        └── cy.ts
```

## Implementation Tasks

### 1. Module Setup
- Create `libs/blob-explorer` directory structure
- Configure package.json with build scripts
- Add TypeScript configuration
- Register module in root tsconfig.json paths
- Register module in apps/web/src/app.ts

### 2. System Admin Dashboard Enhancement
- Add Blob Explorer tile to existing dashboard
- Update dashboard page controller to include tile
- Add tile routing to blob-explorer-locations
- Ensure tile visible only to System Admin users

### 3. Database Services
**location-service.ts:**
- `getLocationsWithPublicationCount()` - Query all locations with publication counts

**publication-service.ts:**
- `getPublicationsByLocation(locationId)` - Query publications for a location
- `getPublicationMetadata(artefactId)` - Retrieve full metadata for a publication
- `getPublicationType(artefactId)` - Determine if JSON or flat file
- `getJsonContent(artefactId)` - Retrieve raw JSON content
- `getRenderedTemplate(artefactId)` - Get rendered publication HTML
- `getFlatFileUrl(artefactId)` - Get blob storage URL for flat file

**resubmission-service.ts:**
- `triggerResubmission(artefactId)` - Trigger subscription notifications for publication
- `getSubscribersForPublication(artefactId)` - Get all subscribers for a publication
- `sendNotifications(subscribers, publication)` - Send notifications to subscribers

### 4. Page Controllers and Templates

**blob-explorer-locations (Page 2):**
- GET: Render locations table with publication counts
- Use location-service to fetch data
- Display table with Location and Number of publications columns
- Make rows clickable to navigate to publications page

**blob-explorer-publications (Page 3):**
- GET: Render publications table for selected location
- Query parameter: locationId
- Use publication-service to fetch publications
- Display Artefact ID (link), List Type, Display From, Display To
- Link Artefact IDs to appropriate file page (JSON or flat file)

**blob-explorer-json-file (Page 4A):**
- GET: Render JSON publication details
- Query parameter: artefactId
- Fetch and display metadata table
- Provide link to rendered template
- Implement accordion for raw JSON content
- Show green "Re-submit subscription" button
- POST: Navigate to confirm-resubmission page

**blob-explorer-flat-file (Page 4B):**
- GET: Render flat file publication details
- Query parameter: artefactId
- Fetch and display metadata table
- Provide link to file (PDF pop-out, Word download)
- Show green "Re-submit subscription" button
- POST: Navigate to confirm-resubmission page

**confirm-resubmission (Page 5):**
- GET: Render confirmation page with summary table
- Query parameter: artefactId
- Display publication metadata in summary table
- Show Confirm button and Cancel link
- POST: Trigger resubmission, redirect to success page
- Cancel: Redirect to blob-explorer-locations

**resubmission-success (Page 6):**
- GET: Render success page
- Display green success banner
- Provide link back to blob-explorer-locations
- Implement POST/Redirect/GET to prevent duplicate submissions

### 5. Locales
Create en.ts and cy.ts with content for:
- Page titles
- Body text
- Button labels
- Link text
- Table column headings
- Error messages
- Success messages

### 6. Accessibility Implementation
- Ensure all interactive elements support keyboard navigation
- Add appropriate ARIA roles for success banners and errors
- Implement aria-expanded and aria-controls for accordion
- Use semantic HTML for tables (<table>, <thead>, <tbody>)
- Add proper heading hierarchy
- Test with screen readers
- Ensure Welsh language switching works correctly

### 7. Styling
- Use GOV.UK Design System components
- Green button styling for "Re-submit subscription" and "Confirm"
- Success banner styling (green)
- Table styling for metadata and lists
- Accordion styling for raw JSON content
- Ensure responsive design

### 8. Integration
- Add Blob Explorer tile to System Admin Dashboard
- Configure routing in apps/web/src/app.ts
- Ensure authentication middleware protects all pages
- Add authorization check for System Admin role

### 9. Testing

**Unit Tests (Vitest):**
- location-service.test.ts - Test location queries
- publication-service.test.ts - Test publication queries and metadata retrieval
- resubmission-service.test.ts - Test resubmission logic and notification sending

**E2E Tests (Playwright):**
- Create single journey test: "System admin can browse and resubmit publication @nightly"
  - Navigate from dashboard to locations
  - Select location and view publications
  - Select publication (test both JSON and flat file)
  - View metadata and rendered content
  - Trigger resubmission workflow
  - Confirm submission and verify success
  - Test Welsh translation at key points
  - Test accessibility inline
  - Test keyboard navigation
  - Verify PRG pattern prevents duplicate submissions

### 10. Documentation
- Update README if needed
- Document resubmission service API
- Add comments for complex blob storage logic

## Dependencies
- @hmcts/postgres - Database access
- @hmcts/auth - Authentication/authorization
- GOV.UK Frontend - UI components
- Azure Blob Storage SDK (if not already present)
- Subscription notification service (existing or new)

## Migration Requirements
- No new database tables expected (uses existing publication/location tables)
- If new tables needed, create Prisma schema in libs/blob-explorer/prisma/

## Risk Considerations
- Ensure resubmission doesn't cause duplicate notifications
- Handle large JSON files in accordion (pagination/truncation if needed)
- Blob storage access permissions for flat files
- Performance of location/publication queries with large datasets
- Audit logging for manual resubmissions

## Definition of Done
- All 6 pages implemented with Welsh translations
- Database services retrieve correct data
- Blob storage integration works for JSON and flat files
- Manual resubmission triggers notifications to subscribers
- POST/Redirect/GET pattern prevents duplicate submissions
- All pages meet WCAG 2.2 AA standards
- E2E journey test passes (including Welsh and accessibility)
- Unit tests achieve >80% coverage on services
- Code reviewed and approved
- Module registered in web application
