# VIBE-317: Implementation Summary

## Status: In Progress

### ✅ Completed Tasks

1. **List Type Registry Updated** - Added 14 new list types (IDs 10-23) to `libs/list-types/common/src/mock-list-types.ts`
2. **Location Data Updated** - Added 4 Administrative Court venues (IDs 11-14) to `libs/location/src/location-data.ts`
3. **Module Structures Created** - Created directory structures for all 5 modules
4. **Dependencies Installed** - Ran `yarn install` to register new workspaces

### 🚧 Remaining Implementation Work

This is a large implementation requiring approximately **1,500+ lines of code across 60+ files**. The foundation is in place, but the following work remains:

## Module 1: RCJ Standard Daily Cause List ⏳

**Location**: `libs/list-types/rcj-standard-daily-cause-list/`

**Files to Create** (Reference: `libs/list-types/care-standards-tribunal-weekly-hearing-list/`):

1. **src/models/types.ts** - Define `StandardHearing` interface with 7 fields
2. **src/conversion/standard-config.ts** - Excel converter for 8 list types (IDs 10-17)
3. **src/validation/json-validator.ts** - JSON schema validator using Ajv
4. **src/rendering/renderer.ts** - Format data for Nunjucks template
5. **src/schemas/standard-daily-cause-list.json** - JSON Schema for validation
6. **src/pages/index.ts** - GET handler that loads artefact and renders template
7. **src/pages/standard-daily-cause-list.njk** - Nunjucks template with GOV.UK table
8. **src/pages/en.ts** - English content for all 8 lists (includes special content for ID 12)
9. **src/pages/cy.ts** - Welsh content for all 8 lists
10. **src/assets/js/search.ts** - Client-side search functionality
11. **src/assets/css/print.css** - Print styles for PDF
12. **Unit tests** - Converter, validator, renderer tests

**Key Implementation Notes**:
- List ID 12 (Court of Appeal Criminal Division) needs special quick guide link
- Search must filter across all table columns
- Time field validation: HH:MM format
- All fields except "Additional Information" are required

## Module 2: London Administrative Court ⏳

**Location**: `libs/list-types/london-administrative-court-daily-cause-list/`

**Files to Create**:

1. **src/models/types.ts** - `LondonAdminCourtData` with mainHearings and planningCourt arrays
2. **src/conversion/london-admin-config.ts** - Two-tab Excel converter
3. **src/validation/json-validator.ts** - Validator for both tabs
4. **src/rendering/renderer.ts** - Render both sections
5. **src/schemas/london-admin-court.json** - JSON Schema
6. **src/pages/index.ts** - GET handler
7. **src/pages/london-admin-court.njk** - Template with two sub-sections
8. **src/pages/en.ts** - English content
9. **src/pages/cy.ts** - Welsh content
10. **Unit tests**

**Key Implementation Notes**:
- Both tabs optional (minRows: 0)
- Tab 2 header: "Planning Court"
- Both tabs have same 7 fields as Module 1

## Module 3: Court of Appeal (Civil Division) ⏳

**Location**: `libs/list-types/rcj-court-of-appeal-civil/`

**Files to Create**:

1. **src/models/types.ts** - `CourtOfAppealCivilData` with dailyHearings and futureJudgments
2. **src/conversion/civil-appeal-config.ts** - Two-tab converter (Tab 2 has 8 fields including Date)
3. **src/validation/json-validator.ts**
4. **src/rendering/renderer.ts**
5. **src/schemas/civil-appeal.json**
6. **src/pages/index.ts**
7. **src/pages/civil-appeal.njk** - Two sub-sections with different column counts
8. **src/pages/en.ts**
9. **src/pages/cy.ts**
10. **Unit tests**

**Key Implementation Notes**:
- Tab 1: 7 columns (standard)
- Tab 2: 8 columns (Date + standard 7)
- Date validation: dd/MM/yyyy format

## Module 4: Administrative Court Daily Cause List ⏳

**Location**: `libs/list-types/administrative-court-daily-cause-list/`

**Files to Create**:

1. **src/models/types.ts** - Reuse `StandardHearing` from Module 1
2. **src/conversion/admin-court-config.ts** - Register 4 converters (IDs 20-23)
3. **src/validation/json-validator.ts** - Same as Module 1
4. **src/rendering/renderer.ts** - Same logic as Module 1
5. **src/schemas/admin-court.json** - Same as Module 1
6. **src/pages/index.ts** - Detect list type like Module 1
7. **src/pages/admin-court.njk** - Same template structure as Module 1
8. **src/pages/en.ts** - Content for 4 lists
9. **src/pages/cy.ts** - Welsh content for 4 lists
10. **Unit tests**

**Key Implementation Notes**:
- Identical format to Module 1 (7 standard columns)
- Different venues (Birmingham, Leeds, Bristol/Cardiff, Manchester)
- Can share most code with Module 1

## Module 5: RCJ Landing Page ⏳

**Location**: `libs/public-pages/src/pages/royal-courts-of-justice/`

**Files to Create**:

1. **index.ts** - GET handler that loads all RCJ list types (IDs 10-18) and sorts alphabetically
2. **royal-courts-of-justice.njk** - Landing page template
3. **en.ts** - English content (page title, FaCT link, caution message)
4. **cy.ts** - Welsh content

**Template Requirements**:
- Page title: "What do you want to view from Royal Courts of Justice?"
- FaCT link (https://www.find-court-tribunal.service.gov.uk/)
- Caution message about 4:30pm changes
- List all RCJ hearing lists (IDs 10-18) alphabetically
- Each list item links to its detail page

## Additional Work Required

### PDF Generation System ⏳

**Location**: `libs/publication/src/pdf/`

1. **pdf-generator.ts** - Puppeteer-based PDF generation utility
2. **Integration** - Add PDF routes to each module's pages
3. **print.css** - PDF-specific styles (hide navigation, proper page breaks)

### Search JavaScript ⏳

**Location**: Each module's `src/assets/js/search.ts`

- Client-side filtering of table rows
- Debounced input handling
- Case-insensitive search across all columns
- Hide/show rows based on match

### App Registration ⏳

**Location**: `apps/web/src/app.ts` and `apps/web/vite.config.ts`

- Import page routes from all 5 modules
- Register with `createSimpleRouter`
- Add assets to Vite config

### TypeScript Path Aliases ⏳

**Location**: Root `tsconfig.json`

```json
{
  "compilerOptions": {
    "paths": {
      "@hmcts/rcj-standard-daily-cause-list": ["libs/list-types/rcj-standard-daily-cause-list/src"],
      "@hmcts/london-administrative-court-daily-cause-list": ["libs/list-types/london-administrative-court-daily-cause-list/src"],
      "@hmcts/rcj-court-of-appeal-civil": ["libs/list-types/rcj-court-of-appeal-civil/src"],
      "@hmcts/administrative-court-daily-cause-list": ["libs/list-types/administrative-court-daily-cause-list/src"]
    }
  }
}
```

### E2E Tests ⏳

**Location**: `e2e-tests/tests/rcj-hearing-lists.spec.ts`

Test scenarios needed:
1. RCJ landing page displays all lists
2. Upload and display standard daily cause list
3. London Admin Court two-tab support
4. Court of Appeal Civil two-tab support
5. Administrative Court lists (4 venues)
6. Welsh translation verification
7. Search functionality
8. PDF downloads
9. Accessibility compliance (WCAG 2.2 AA)

## Recommended Next Steps

Given the scope, I recommend:

1. **Complete Module 1 First** - Use as reference implementation
   - Copy patterns from `care-standards-tribunal-weekly-hearing-list`
   - Add special handling for list type 12 (quick guide link)
   - Implement and test thoroughly

2. **Create Modules 2-4 Based on Module 1**
   - Module 2 & 3: Two-tab Excel support
   - Module 4: Nearly identical to Module 1

3. **Add RCJ Landing Page**
   - Simple page, just loads and lists

4. **Implement PDF Generation**
   - Add Puppeteer dependency
   - Create utility function
   - Add PDF routes to all modules

5. **Create E2E Tests**
   - Follow CLAUDE.md E2E testing guidelines
   - Minimize test count (one per journey)
   - Include validation, Welsh, accessibility inline

6. **Register and Test**
   - Update tsconfig.json
   - Register in apps/web
   - Run builds and tests
   - Fix any issues

## File Count Summary

- **Module 1**: 15-20 files
- **Module 2**: 15 files
- **Module 3**: 15 files
- **Module 4**: 15 files
- **Module 5**: 4 files
- **PDF System**: 5 files
- **Tests**: 5 files
- **Config Files**: 5 files

**Total**: ~80 files, ~2,000 lines of code

## Reference Implementations

- **Existing Module**: `libs/list-types/care-standards-tribunal-weekly-hearing-list/`
- **Planning Document**: `docs/tickets/VIBE-317/plan.md`
- **Specification**: `docs/tickets/VIBE-317/specification.md`
- **Module Guidelines**: `CLAUDE.md` (Module Development Guidelines section)

## Notes for Future Implementation

- Use TypeScript strict mode
- Follow GOV.UK Design System patterns
- Ensure full WCAG 2.2 AA accessibility
- Test both English and Welsh content
- Validate all user inputs
- Sanitize HTML in Excel data
- Handle missing artefacts gracefully
- Test with large data sets (1000+ rows)
- Optimize search for performance
- Cache PDF generation where appropriate
