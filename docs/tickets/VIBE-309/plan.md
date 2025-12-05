# VIBE-309: Technical Implementation Plan

## Overview
This ticket migrates list type information from mock files to the database and implements System Admin screens to configure list types. The implementation includes database schema creation, CRUD operations for list types, and a five-page configuration workflow.

## Summary
Replace the mock list type file with database-backed list type management. System administrators can create new list types through a structured workflow: entering details, selecting sub-jurisdictions, reviewing, and confirming. All existing pages that reference mock list types will be updated to query the database instead.

## Architecture

### Database Schema

**Table: list_types**
- id (INTEGER PRIMARY KEY)
- name (VARCHAR(1000) NOT NULL)
- friendly_name (VARCHAR(1000))
- welsh_friendly_name (VARCHAR(255))
- shortened_friendly_name (VARCHAR(255))
- url (VARCHAR(255))
- default_sensitivity (VARCHAR(50))
- allowed_provenance (VARCHAR(50) NOT NULL)
- is_non_strategic (BOOLEAN DEFAULT false)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

**Table: list_types_sub_jurisdictions (junction table)**
- id (INTEGER PRIMARY KEY)
- list_type_id (INTEGER FK → list_types.id)
- sub_jurisdiction_id (INTEGER FK → sub_jurisdictions.id)
- UNIQUE constraint on (list_type_id, sub_jurisdiction_id)
- CASCADE DELETE on list_type_id

### Data Migration Strategy
1. Create database tables
2. Implement CRUD services
3. Build admin UI for creating list types
4. Manually enter data from mock file through admin UI
5. Update all consumers to use database queries
6. Delete mock file

## Module Structure

Create new module: `libs/configure-list-type`

```
libs/configure-list-type/
├── package.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma           # Prisma models for list_types and junction table
└── src/
    ├── index.ts                # Business logic exports
    ├── config.ts               # Module configuration
    ├── pages/
    │   ├── enter-list-type-details.ts
    │   ├── enter-list-type-details.njk
    │   ├── select-sub-jurisdictions.ts
    │   ├── select-sub-jurisdictions.njk
    │   ├── preview-list-type.ts
    │   ├── preview-list-type.njk
    │   ├── list-type-success.ts
    │   └── list-type-success.njk
    ├── services/
    │   ├── list-type-service.ts
    │   └── sub-jurisdiction-service.ts
    └── locales/
        ├── en.ts
        └── cy.ts
```

## Implementation Tasks

### 1. Database Schema Creation

**Create Prisma Schema (libs/configure-list-type/prisma/schema.prisma):**
```prisma
model ListType {
  id                      Int       @id @default(autoincrement())
  name                    String    @db.VarChar(1000)
  friendlyName            String?   @map("friendly_name") @db.VarChar(1000)
  welshFriendlyName       String?   @map("welsh_friendly_name") @db.VarChar(255)
  shortenedFriendlyName   String?   @map("shortened_friendly_name") @db.VarChar(255)
  url                     String?   @db.VarChar(255)
  defaultSensitivity      String?   @map("default_sensitivity") @db.VarChar(50)
  allowedProvenance       String    @map("allowed_provenance") @db.VarChar(50)
  isNonStrategic          Boolean   @default(false) @map("is_non_strategic")
  createdAt               DateTime  @default(now()) @map("created_at")
  updatedAt               DateTime  @updatedAt @map("updated_at")

  subJurisdictions        ListTypeSubJurisdiction[]

  @@map("list_type")
}

model ListTypeSubJurisdiction {
  id                  Int       @id @default(autoincrement())
  listTypeId          Int       @map("list_type_id")
  subJurisdictionId   Int       @map("sub_jurisdiction_id")

  listType            ListType        @relation(fields: [listTypeId], references: [id], onDelete: Cascade)
  subJurisdiction     SubJurisdiction @relation(fields: [subJurisdictionId], references: [id])

  @@unique([listTypeId, subJurisdictionId])
  @@map("list_type_sub_jurisdiction")
}
```

**Run migrations:**
- `yarn db:migrate:dev` to create tables
- `yarn db:generate` to generate Prisma client

### 2. Database Services

**list-type-service.ts:**
- `createListType(data)` - Create new list type with sub-jurisdictions
- `getListTypeById(id)` - Get list type by ID
- `getAllListTypes()` - Get all list types
- `getListTypesBySubJurisdiction(subJurisdictionId)` - Filter by sub-jurisdiction
- `updateListType(id, data)` - Update list type
- `deleteListType(id)` - Delete list type (cascades to junction table)

**sub-jurisdiction-service.ts:**
- `getAllSubJurisdictions()` - Get all sub-jurisdictions for checkbox display

### 3. System Admin Dashboard Enhancement
- Add "Configure List Type" tile to existing dashboard
- Update dashboard page controller to include tile
- Add tile routing to enter-list-type-details
- Ensure tile visible only to System Admin users

### 4. Page Controllers and Templates

**enter-list-type-details (Page 2):**
- GET: Render form with all fields
- POST: Validate inputs, store in session, redirect to select-sub-jurisdictions
- Validation:
  - All fields required
  - name: max 1000 chars
  - friendly_name: max 1000 chars
  - welsh_friendly_name: max 255 chars
  - shortened_friendly_name: max 255 chars
  - url: max 255 chars, valid path format
  - default_sensitivity: one of [Public, Private, Classified]
  - allowed_provenance: at least one of [CFT_IDAM, B2C, COMMON_PLATFORM]
  - is_non_strategic: Yes or No

**select-sub-jurisdictions (Page 3):**
- GET: Query all sub-jurisdictions from database, render as checkboxes
- POST: Validate at least one selected, store in session, redirect to preview-list-type
- Back link: return to enter-list-type-details with values retained

**preview-list-type (Page 4):**
- GET: Display all entered data from session in summary table
- POST: Save to database using list-type-service, redirect to list-type-success
- Cancel link: redirect to System Admin dashboard
- Implement POST/Redirect/GET pattern

**list-type-success (Page 5):**
- GET: Display success banner
- Provide link to System Admin dashboard
- Clear session data

### 5. Session Management
- Store form data in session across pages 2-4
- Clear session after successful save
- Handle back navigation with session data retention

### 6. Locales
Create en.ts and cy.ts with content for:
- Page titles
- Form labels
- Button text
- Error messages
- Success messages
- Table headings

### 7. Update Existing Consumers

**Find all references to mock-list-types.ts:**
- Use Grep tool to find all imports of mock-list-types.ts
- Update each consumer to use database queries via list-type-service

**Update manual and non-strategic upload pages:**
- Change dropdown population to use `shortened_friendly_name` from database
- Query list-type-service instead of mock file

### 8. Data Migration
- Manually create list types through admin UI using data from mock-list-types.ts
- Verify all list types migrated correctly
- Test existing functionality with database-backed list types

### 9. Delete Mock File
- Once all consumers updated and tested, delete `libs/list-types/common/src/mock-list-types.ts`
- Remove any imports or references to the file

### 10. Accessibility Implementation
- Ensure all form fields support keyboard navigation
- Add appropriate ARIA roles for form elements
- Implement aria-describedby for error messages
- Use semantic HTML for forms and tables
- Add proper heading hierarchy
- Test with screen readers
- Ensure Welsh language switching works correctly

### 11. Styling
- Use GOV.UK Design System components:
  - Text input
  - Select (dropdown)
  - Checkboxes
  - Radios
  - Button
  - Error summary
  - Summary list (for preview)
  - Success banner
- Ensure responsive design
- Follow GOV.UK spacing and typography

### 12. Integration
- Add "Configure List Type" tile to System Admin Dashboard
- Configure routing in apps/web/src/app.ts
- Ensure authentication middleware protects all pages
- Add authorization check for System Admin role
- Register module in root tsconfig.json

### 13. Testing

**Unit Tests (Vitest):**
- list-type-service.test.ts - Test CRUD operations
  - Create list type with sub-jurisdictions
  - Get all list types
  - Get list type by ID
  - Update list type
  - Delete list type
  - Verify cascade delete on junction table
- sub-jurisdiction-service.test.ts - Test queries
- Validation logic tests for each field

**E2E Tests (Playwright):**
- Create single journey test: "System admin can configure list type @nightly"
  - Navigate from dashboard to configure list type
  - Enter all list type details with valid data
  - Test validation errors (empty fields, invalid formats)
  - Select sub-jurisdictions
  - Review preview page
  - Confirm and verify success
  - Test back navigation preserves data
  - Test Welsh translation at key points
  - Test accessibility inline
  - Test keyboard navigation
  - Verify PRG pattern prevents duplicate submissions
  - Verify list type appears in database
  - Verify list type appears in manual upload dropdown

### 14. Documentation
- Update README if needed
- Document list-type-service API
- Add migration notes for future reference

## Dependencies
- @hmcts/postgres - Database access via Prisma
- @hmcts/auth - Authentication/authorization
- GOV.UK Frontend - UI components
- express-session - Session management for multi-step form

## Migration Requirements
- Create Prisma schema in libs/configure-list-type/prisma/
- Run `yarn db:migrate:dev` to create tables
- Register schema in apps/postgres/src/schema-discovery.ts

## Branch Strategy
- Create branch from master (not from vibe-166-cst-excel-list as mentioned in description, unless there's a specific dependency)

## Risk Considerations
- Ensure data migration from mock file is complete before deleting file
- Verify all consumers updated to prevent runtime errors
- Handle allowed_provenance as array in UI but store as comma-separated string in DB
- Session data size limits if storing large amounts of data
- Concurrent submissions (handle with transactions)

## Definition of Done
- Database tables created with proper constraints
- All 5 configuration pages implemented with Welsh translations
- CRUD services for list types functional
- System Admin Dashboard has "Configure List Type" tile
- All form validation working
- Data from mock file migrated to database
- All existing consumers updated to use database
- Mock file deleted
- All pages meet WCAG 2.2 AA standards
- E2E journey test passes (including Welsh and accessibility)
- Unit tests achieve >80% coverage on services
- Manual upload page uses shortened_friendly_name from database
- Code reviewed and approved
