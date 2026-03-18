# Implementation Tasks for VIBE-151

## Tasks

### 1. Database & Data Model
- [x] Review SJP public and press list JSON schemas
- [x] Create Prisma schema for SJP cases (handle up to 30,000 cases)
- [x] Add database migrations for SJP tables
- [x] Create data ingestion service to import SJP lists from JSON

### 2. Backend Implementation
- [x] Create SJP service module in `libs/`
- [x] Implement SJP list retrieval logic (public and press)
- [x] Implement search functionality (max 200 chars)
- [x] Implement postcode filter with UK postcode validation (changed to outward code only)
- [x] Implement prosecutor filter
- [x] Implement pagination logic
- [x] Create download functionality for SJP lists (CSV format)
- [x] Add authentication check for press list access (verified users only)
- [x] Implement dynamic filter generation (postcodes and prosecutors from actual data)

### 3. Page 1: SJP Selection Page
- [x] Create page controller at `libs/sjp/src/pages/sjp-selection/index.ts`
- [x] Create Nunjucks template at `libs/sjp/src/pages/sjp-selection/index.njk`
- [x] Add English content for page
- [x] Add Welsh translations
- [x] Implement navigation links to public and press lists
- [x] Add back navigation

### 4. Page 2: SJP Public List Page
- [x] Create page controller at `libs/sjp/src/pages/sjp-public-list/index.ts`
- [x] Create Nunjucks template at `libs/sjp/src/pages/sjp-public-list/index.njk`
- [x] Implement table display with columns: Name, Postcode, Offence, Prosecutor
- [x] Add search bar functionality
- [x] Implement "Show filters" button and filter accordions
- [x] Add postcode filter with validation
- [x] Add prosecutor dropdown filter
- [x] Implement "Clear filter" functionality
- [x] Add pagination controls
- [x] Add "Download a copy" button
- [x] Add "Back to Top" functionality
- [x] Add English and Welsh content
- [x] Implement error handling for invalid postcode

### 5. Page 3: SJP Press List Page
- [x] Create page controller at `libs/sjp/src/pages/sjp-press-list/index.ts`
- [x] Create Nunjucks template at `libs/sjp/src/pages/sjp-press-list/index.njk`
- [x] Add "What are Single Justice Procedure Cases?" accordion (open by default)
- [x] Display publication date and time
- [x] Add "Important Information" accordion with media protocol link
- [x] Implement sectioned case layout with fields: Name, DOB, Reference, Address, Prosecutor, Reporting Restriction
- [x] Add search bar functionality
- [x] Implement filter functionality (postcode, prosecutor)
- [x] Add pagination controls
- [x] Add "Download a copy" button
- [x] Add "Back to Top" functionality
- [x] Add English and Welsh content
- [x] Implement access control (verified users only)

### 6. Accessibility Implementation
- [x] Add proper ARIA attributes to accordions (`aria-expanded`, `aria-controls`)
- [x] Ensure keyboard navigation works (Tab, Enter, Space)
- [x] Add proper labels to search inputs (not placeholder-only)
- [x] Ensure pagination announces current page to screen readers
- [x] Test filter controls with keyboard
- [x] Ensure "Back to Top" is keyboard-operable
- [x] Add accessible name to download button
- [x] Verify logical tab order across all pages

### 7. Testing
- [x] Write unit tests for SJP service
- [x] Write unit tests for search functionality
- [x] Write unit tests for filter logic
- [x] Write unit tests for pagination
- [x] Write unit tests for dynamic postcode generation
- [x] Create E2E test for press list page (TS3, TS5, TS6-TS12)
- [x] Test accessibility with Axe (TS16)
- [x] Test Welsh language toggle (TS17)
- [ ] Create E2E test for SJP selection page (TS1)
- [ ] Create E2E test for public list page (TS2, TS4, TS6-TS12)
- [ ] Test with 30,000 case load for performance

### 8. Module Registration & Configuration
- [x] Create module structure in `libs/sjp`
- [x] Add `config.ts` with pageRoutes export
- [x] Update root `tsconfig.json` with `@hmcts/sjp` path
- [x] Register module in `apps/web/src/app.ts`
- [ ] Register assets in `apps/web/vite.config.ts`
- [ ] Add module to turbo.json if needed

### 9. Documentation & Deployment
- [ ] Update README with SJP feature documentation
- [ ] Add inline code comments where logic isn't self-evident
- [ ] Ensure all TypeScript strict mode checks pass
- [ ] Run `yarn lint:fix` and fix all Biome warnings
- [ ] Download style guide attachment from JIRA for reference

## Notes

### Performance Considerations
- The system must handle up to 30,000 SJP cases
- Consider implementing:
  - Server-side pagination
  - Efficient database indexing on searchable fields
  - Caching for frequently accessed lists
  - Virtual scrolling if displaying large result sets

### Authentication
- Public list: accessible to all users
- Press list: requires verified user authentication
- Ensure proper middleware is in place for access control

### Filter Implementation
- Postcode filter must validate UK postcode format
- Prosecutor filter options come from list metadata
- Filters should work together (AND logic)
- Clear filter should reset all active filters

### Accordion Pattern
- Use GOV.UK accordion component
- Ensure proper ARIA attributes for accessibility
- "What are Single Justice Procedure Cases?" accordion should be open by default on press list page

### Download Functionality
- Consider format for download (PDF, CSV, etc.)
- Ensure download includes all filtered results or just current page
- Add proper filename with date/timestamp

### Welsh Translation
- All pages require Welsh translations
- Currently using "Welsh placeholder" - these need to be replaced with actual translations
- Ensure language toggle works across all three pages
