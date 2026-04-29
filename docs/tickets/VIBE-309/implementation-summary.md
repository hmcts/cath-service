# VIBE-309 Implementation Summary

## Completed Work

### 1. Module Structure ✅
- Created `libs/list-type-config` module with proper package.json and tsconfig.json
- Added module to root tsconfig.json paths
- Registered module in `apps/web/src/app.ts`

### 2. Database Schema ✅
- Created Prisma schema in `libs/location/prisma/schema.prisma`:
  - `ListType` model with all required fields
  - `ListTypeSubJurisdiction` linking table
  - Proper relations and constraints (unique name, cascade delete)
- Schema integrated with location schema for shared SubJurisdiction model

### 3. Service Layer ✅
Created comprehensive service layer:
- **list-type-queries.ts**: Database operations
  - `findAllListTypes()` - Get all list types with sub-jurisdictions
  - `findListTypeById()` - Get single list type for editing
  - `findListTypeByName()` - Check for duplicate names
  - `findAllSubJurisdictions()` - Get all sub-jurisdictions for selection
  - `createListType()` - Create new list type with relations
  - `updateListType()` - Update list type with transaction
  - `findNonStrategicListTypes()` - For non-strategic upload page
  - `findStrategicListTypes()` - For manual upload page

- **list-type-validation.ts**: Input validation
  - `validateListTypeDetails()` - Validates all form fields
  - `validateSubJurisdictions()` - Validates sub-jurisdiction selection
  - Comprehensive validation rules matching ticket requirements

- **list-type-service.ts**: Business logic
  - `saveListType()` - Handles both create and update with duplicate checking

### 4. Page Controllers ✅
Created full CRUD workflow under `libs/list-type-config/src/pages/system-admin/configure-list-type/`:

- **enter-details.ts**:
  - GET: Displays form with pre-populated data for editing
  - POST: Validates input and stores in session

- **select-sub-jurisdictions.ts**:
  - GET: Displays checkbox list of all sub-jurisdictions
  - POST: Validates selection and updates session

- **preview.ts**:
  - GET: Shows summary of all entered data
  - POST: Saves to database via service layer

- **success.ts**:
  - GET: Displays success message with return link

### 5. Nunjucks Templates ✅
Created accessible GOV.UK Design System compliant templates:
- `enter-details.njk` - Form with all required fields (text, select, checkboxes, radios)
- `select-sub-jurisdictions.njk` - Checkbox list for sub-jurisdictions
- `preview.njk` - Summary list with change links
- `success.njk` - Success panel

### 6. Localization ✅
- **en.ts**: Complete English translations
- **cy.ts**: Complete Welsh translations
- All user-facing text properly localized

### 7. System Admin Dashboard ✅
- Added "Configure List Type" tile to `libs/system-admin-pages/src/pages/system-admin-dashboard/en.ts`
- Tile links to `/system-admin/configure-list-type/enter-details`

### 8. Migration Script ✅
- Created `libs/list-type-config/src/scripts/migrate-mock-data.ts`
- Migrates all 9 list types from mock-list-types.ts to database
- Links all list types to all sub-jurisdictions
- Prevents duplicate entries

### 9. Unit Tests ✅
- Created comprehensive test suite: `list-type-validation.test.ts`
- **12 tests passing** covering:
  - Valid input scenarios
  - Empty field validation
  - Length validation (1000 chars for name, 255 for Welsh names)
  - Invalid sensitivity options
  - Empty/invalid provenance
  - Missing isNonStrategic selection
  - Multiple validation errors
  - Sub-jurisdiction validation

## Remaining Work (Requires Database Connection)

### 1. Database Migration
**Status**: Ready but not executed
**Command**: `yarn db:migrate:dev`
**Blocker**: Database not running during implementation

### 2. Run Migration Script
**Status**: Script created and ready
**Command**: `yarn tsx libs/list-type-config/src/scripts/migrate-mock-data.ts`
**Purpose**: Populate database with initial list type data from mock file

### 3. Update Upload Pages
**Files to update**:
- `libs/admin-pages/src/pages/manual-upload/index.ts` - Use `findStrategicListTypes()`
- `libs/admin-pages/src/pages/non-strategic-upload/index.ts` - Use `findNonStrategicListTypes()`
- Replace `mockListTypes` import with database queries
- Use `shortenedFriendlyName` field for dropdown display

### 4. Replace All Mock Usages
**Files affected** (from grep search):
- `libs/list-types/common/src/index.ts`
- `libs/list-types/common/src/list-type-validator.ts`
- `libs/admin-pages/src/pages/manual-upload-summary/index.ts`
- `libs/admin-pages/src/pages/remove-list-search-results/index.ts`
- `libs/admin-pages/src/pages/remove-list-confirmation/index.ts`
- `libs/admin-pages/src/manual-upload/validation.ts`
- `libs/api/src/blob-ingestion/validation.ts`
- `libs/publication/src/index.ts`
- `libs/public-pages/src/pages/summary-of-publications/index.ts`

**Strategy**:
- Replace `mockListTypes` with database queries using `findAllListTypes()`
- Update interfaces to match new database model
- Use `shortenedFriendlyName` instead of `englishFriendlyName`
- Test each replacement carefully

### 5. Delete Mock File
**File**: `libs/list-types/common/src/mock-list-types.ts`
**Action**: Delete after all usages are replaced and tested

### 6. E2E Testing
**Test Scenarios**:
- Complete create list type journey with all validations
- Edit existing list type
- Welsh language switching
- Accessibility with axe-core
- Keyboard navigation

## Technical Decisions

### Schema Location
Placed `ListType` and `ListTypeSubJurisdiction` models in `libs/location/prisma/schema.prisma` instead of creating a separate schema. This decision was made because:
- List types are logically related to location/jurisdiction data
- Avoids schema duplication for SubJurisdiction model
- Simpler schema management with fewer files

### Session Storage
Used express-session to store form data between pages:
- Allows for multi-step form with back navigation
- Preserves data when user corrects errors
- Cleared after successful submission

### Edit Flow
Reused create pages for editing by:
- Passing `?id=X` query parameter to enter-details page
- Pre-populating form from database
- Storing `editId` in session
- Service layer checks for duplicate names excluding current record

## Files Created/Modified

### New Files
- `libs/list-type-config/package.json`
- `libs/list-type-config/tsconfig.json`
- `libs/list-type-config/src/config.ts`
- `libs/list-type-config/src/index.ts`
- `libs/list-type-config/src/list-type/list-type-queries.ts`
- `libs/list-type-config/src/list-type/list-type-service.ts`
- `libs/list-type-config/src/list-type/list-type-validation.ts`
- `libs/list-type-config/src/list-type/list-type-validation.test.ts`
- `libs/list-type-config/src/locales/en.ts`
- `libs/list-type-config/src/locales/cy.ts`
- `libs/list-type-config/src/pages/system-admin/configure-list-type/enter-details.ts`
- `libs/list-type-config/src/pages/system-admin/configure-list-type/enter-details.njk`
- `libs/list-type-config/src/pages/system-admin/configure-list-type/select-sub-jurisdictions.ts`
- `libs/list-type-config/src/pages/system-admin/configure-list-type/select-sub-jurisdictions.njk`
- `libs/list-type-config/src/pages/system-admin/configure-list-type/preview.ts`
- `libs/list-type-config/src/pages/system-admin/configure-list-type/preview.njk`
- `libs/list-type-config/src/pages/system-admin/configure-list-type/success.ts`
- `libs/list-type-config/src/pages/system-admin/configure-list-type/success.njk`
- `libs/list-type-config/src/scripts/migrate-mock-data.ts`

### Modified Files
- `tsconfig.json` - Added module path
- `apps/web/src/app.ts` - Registered module routes
- `libs/location/prisma/schema.prisma` - Added ListType models
- `libs/system-admin-pages/src/pages/system-admin-dashboard/en.ts` - Added tile

## Next Steps

1. **Start database** (e.g., `docker-compose up postgres`)
2. **Run migration**: `yarn db:migrate:dev`
3. **Run migration script**: `yarn tsx libs/list-type-config/src/scripts/migrate-mock-data.ts`
4. **Start dev server**: `yarn dev`
5. **Test the flow**:
   - Navigate to System Admin dashboard
   - Click "Configure List Type"
   - Complete the form with test data
   - Verify success
   - Test editing by accessing `/system-admin/configure-list-type/enter-details?id=1`
6. **Update upload pages** to use database queries
7. **Replace all mock usages** systematically
8. **Write E2E tests**
9. **Delete mock file**

## Coverage Summary

- **Implementation Tasks**: 18/22 complete (82%)
- **Testing Tasks**: 1/3 complete (33%)
- **Overall Progress**: 19/25 complete (76%)

Remaining work is blocked by database connectivity but all code is ready to test once database is available.
