# Implementation Tasks for VIBE-151

## Tasks

### 1. Database & Data Model
- [ ] Review SJP public and press list JSON schemas
- [ ] Create Prisma schema for SJP cases (handle up to 30,000 cases)
- [ ] Add database migrations for SJP tables
- [ ] Create data ingestion service to import SJP lists from JSON

### 2. Backend Implementation
- [ ] Create SJP service module in `libs/`
- [ ] Implement SJP list retrieval logic (public and press)
- [ ] Implement search functionality (max 200 chars)
- [ ] Implement postcode filter with UK postcode validation
- [ ] Implement prosecutor filter
- [ ] Implement pagination logic
- [ ] Create download functionality for SJP lists
- [ ] Add authentication check for press list access (verified users only)

### 3. Page 1: SJP Selection Page
- [ ] Create page controller at `libs/sjp/src/pages/sjp-selection.ts`
- [ ] Create Nunjucks template at `libs/sjp/src/pages/sjp-selection.njk`
- [ ] Add English content for page
- [ ] Add Welsh translations (placeholders initially)
- [ ] Implement navigation links to public and press lists
- [ ] Add back navigation

### 4. Page 2: SJP Public List Page
- [ ] Create page controller at `libs/sjp/src/pages/sjp-public-list.ts`
- [ ] Create Nunjucks template at `libs/sjp/src/pages/sjp-public-list.njk`
- [ ] Implement table display with columns: Name, Postcode, Offence, Prosecutor
- [ ] Add search bar functionality
- [ ] Implement "Show filters" button and filter accordions
- [ ] Add postcode filter with validation
- [ ] Add prosecutor dropdown filter
- [ ] Implement "Clear filter" functionality
- [ ] Add pagination controls
- [ ] Add "Download a copy" button
- [ ] Add "Back to Top" functionality
- [ ] Add English and Welsh content
- [ ] Implement error handling for invalid postcode

### 5. Page 3: SJP Press List Page
- [ ] Create page controller at `libs/sjp/src/pages/sjp-press-list.ts`
- [ ] Create Nunjucks template at `libs/sjp/src/pages/sjp-press-list.njk`
- [ ] Add "What are Single Justice Procedure Cases?" accordion (open by default)
- [ ] Display publication date and time
- [ ] Add "Important Information" accordion with media protocol link
- [ ] Implement sectioned case layout with fields: Name, DOB, Reference, Address, Prosecutor, Reporting Restriction
- [ ] Add search bar functionality
- [ ] Implement filter functionality (postcode, prosecutor)
- [ ] Add pagination controls
- [ ] Add "Download a copy" button
- [ ] Add "Back to Top" functionality
- [ ] Add English and Welsh content
- [ ] Implement access control (verified users only)

### 6. Accessibility Implementation
- [ ] Add proper ARIA attributes to accordions (`aria-expanded`, `aria-controls`)
- [ ] Ensure keyboard navigation works (Tab, Enter, Space)
- [ ] Add proper labels to search inputs (not placeholder-only)
- [ ] Ensure pagination announces current page to screen readers
- [ ] Test filter controls with keyboard
- [ ] Ensure "Back to Top" is keyboard-operable
- [ ] Add accessible name to download button
- [ ] Verify logical tab order across all pages

### 7. Testing
- [ ] Write unit tests for SJP service
- [ ] Write unit tests for search functionality
- [ ] Write unit tests for filter logic
- [ ] Write unit tests for pagination
- [ ] Create E2E test for SJP selection page (TS1)
- [ ] Create E2E test for public list page (TS2, TS4, TS6-TS12)
- [ ] Create E2E test for press list page (TS3, TS5, TS6-TS12)
- [ ] Test accessibility with Axe (TS16)
- [ ] Test Welsh language toggle (TS17)
- [ ] Test with 30,000 case load for performance

### 8. Module Registration & Configuration
- [ ] Create module structure in `libs/sjp`
- [ ] Add `config.ts` with pageRoutes export
- [ ] Update root `tsconfig.json` with `@hmcts/sjp` path
- [ ] Register module in `apps/web/src/app.ts`
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
