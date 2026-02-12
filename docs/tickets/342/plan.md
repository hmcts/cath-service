# Technical Plan: Refactor List Types to Database

## 1. Technical Approach

### Overview
This is a backend refactor to migrate list type information from a hardcoded mock file to a proper database table with foreign key relationships. The refactor will:
- Create a new `list_type` table in the database
- Establish foreign key relationship from `artefact.list_type_id` to `list_type.id`
- Replace all 18 usages of `mockListTypes` array with database queries
- Create a service layer for list type operations
- Remove the mock file and update all imports

### Architecture Decisions

**Database Schema Location:**
Since list types are foundational reference data used across multiple modules (publication, admin-pages, public-pages, api), the schema will be added to the main `apps/postgres/prisma/schema.prisma` file rather than a module-specific schema. This is similar to how `Artefact` and `User` models are organized.

**Service Layer Organization:**
Create a new module `libs/list-types/repository` to encapsulate database operations for list types. This follows the monorepo pattern of separating data access from business logic.

**Migration Strategy:**
Use Prisma migrations to:
1. Create `list_type` table with seed data
2. Add foreign key constraint to existing `artefact` table
3. Maintain backward compatibility by preserving existing list type IDs (1-9)

**Async Conversion:**
All functions currently using synchronous array operations (`.find()`, `.filter()`) must be converted to async functions with database queries. This impacts function signatures throughout the codebase.

### Key Technical Considerations

1. **Referential Integrity**: The foreign key relationship will prevent orphaned artefact records with invalid list type IDs
2. **Performance**: List types are relatively static reference data (9 records). No caching needed initially, but can be added if performance becomes an issue
3. **Transaction Safety**: The migration must be atomic to ensure data consistency
4. **Test Updates**: All unit tests mocking `mockListTypes` must be updated to mock Prisma client instead

## 2. Implementation Details

### Database Schema Changes

**File:** `apps/postgres/prisma/schema.prisma`

Add new model:
```prisma
model ListType {
  id                  Int         @id
  name                String      @unique @db.VarChar(100)
  englishFriendlyName String      @map("english_friendly_name") @db.VarChar(255)
  welshFriendlyName   String      @map("welsh_friendly_name") @db.VarChar(255)
  provenance          String      @db.VarChar(50)
  urlPath             String?     @map("url_path") @db.VarChar(100)
  isNonStrategic      Boolean     @map("is_non_strategic") @default(false)

  artefacts           Artefact[]

  @@map("list_type")
}
```

Update existing `Artefact` model:
```prisma
model Artefact {
  // ... existing fields ...
  listTypeId        Int             @map("list_type_id")
  listType          ListType        @relation(fields: [listTypeId], references: [id])
  // ... rest of fields ...
}
```

### Migration File Structure

**File:** `apps/postgres/prisma/migrations/[timestamp]_create_list_type_table/migration.sql`

```sql
-- Create list_type table
CREATE TABLE list_type (
  id INT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  english_friendly_name VARCHAR(255) NOT NULL,
  welsh_friendly_name VARCHAR(255) NOT NULL,
  provenance VARCHAR(50) NOT NULL,
  url_path VARCHAR(100),
  is_non_strategic BOOLEAN NOT NULL DEFAULT false
);

-- Seed data (9 existing list types)
INSERT INTO list_type (id, name, english_friendly_name, welsh_friendly_name, provenance, url_path, is_non_strategic)
VALUES
  (1, 'CIVIL_DAILY_CAUSE_LIST', 'Civil Daily Cause List', 'Civil Daily Cause List', 'CFT_IDAM', 'civil-daily-cause-list', false),
  (2, 'FAMILY_DAILY_CAUSE_LIST', 'Family Daily Cause List', 'Family Daily Cause List', 'CFT_IDAM', 'family-daily-cause-list', false),
  (3, 'CRIME_DAILY_LIST', 'Crime Daily List', 'Crime Daily List', 'CRIME_IDAM', 'crime-daily-list', false),
  (4, 'MAGISTRATES_PUBLIC_LIST', 'Magistrates Public List', 'Magistrates Public List', 'CFT_IDAM', 'magistrates-public-list', false),
  (5, 'CROWN_WARNED_LIST', 'Crown Warned List', 'Crown Warned List', 'CFT_IDAM', 'crown-warned-list', false),
  (6, 'CROWN_DAILY_LIST', 'Crown Daily List', 'Crown Daily List', 'CFT_IDAM', 'crown-daily-cause-list', false),
  (7, 'CROWN_FIRM_LIST', 'Crown Firm List', 'Crown Firm List', 'CFT_IDAM', 'crown-firm-list', false),
  (8, 'CIVIL_AND_FAMILY_DAILY_CAUSE_LIST', 'Civil and Family Daily Cause List', 'Rhestr Achos Dyddiol Sifil a Theulu', 'CFT_IDAM', 'civil-and-family-daily-cause-list', false),
  (9, 'CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST', 'Care Standards Tribunal Weekly Hearing List', 'Welsh placeholder', 'MANUAL_UPLOAD', 'care-standards-tribunal-weekly-hearing-list', true);

-- Add foreign key constraint to artefact table
ALTER TABLE artefact
  ADD CONSTRAINT artefact_list_type_id_fkey
  FOREIGN KEY (list_type_id) REFERENCES list_type(id);
```

### New Service Module Structure

**Module:** `libs/list-types/repository`

```
libs/list-types/repository/
├── package.json
├── tsconfig.json
└── src/
    ├── config.ts              # Module configuration
    ├── index.ts               # Service function exports
    ├── list-type-service.ts   # Service functions
    └── list-type-service.test.ts
```

**File:** `libs/list-types/repository/src/list-type-service.ts`

```typescript
import { prisma } from "@hmcts/postgres";
import type { ListType } from "@prisma/client";

export async function getAllListTypes(): Promise<ListType[]> {
  return prisma.listType.findMany({
    orderBy: { id: "asc" }
  });
}

export async function getListTypeById(id: number): Promise<ListType | null> {
  return prisma.listType.findUnique({
    where: { id }
  });
}

export async function getNonStrategicListTypes(): Promise<ListType[]> {
  return prisma.listType.findMany({
    where: { isNonStrategic: true },
    orderBy: { id: "asc" }
  });
}

export async function getStrategicListTypes(): Promise<ListType[]> {
  return prisma.listType.findMany({
    where: { isNonStrategic: false },
    orderBy: { id: "asc" }
  });
}

export async function getListTypeByName(name: string): Promise<ListType | null> {
  return prisma.listType.findUnique({
    where: { name }
  });
}
```

**File:** `libs/list-types/repository/package.json`

```json
{
  "name": "@hmcts/list-types-repository",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "production": "./dist/index.js",
      "default": "./src/index.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "format": "biome format --write .",
    "lint": "biome check .",
    "lint:fix": "biome check --write ."
  },
  "peerDependencies": {
    "@hmcts/postgres": "workspace:*"
  }
}
```

### Files Requiring Updates

#### Publication Module (4 files)

1. **`libs/publication/src/repository/queries.ts`**
   - Lines 182, 204: Replace `mockListTypes.find()` with `await getListTypeById()`
   - Make functions async

2. **`libs/publication/src/repository/service.ts`**
   - Line 60: Replace mock import with service import
   - Update function signature to async

3. **`libs/publication/src/authorisation/middleware.ts`**
   - Line 87: Replace `mockListTypes.find()` with `await getListTypeById()`
   - Make middleware async (already is)

4. **`libs/publication/src/index.ts`**
   - Remove `mockListTypes` export
   - Keep `ListType` type export (now from `@prisma/client`)

#### Admin Pages Module (8 files)

1. **`libs/admin-pages/src/pages/manual-upload/index.ts`**
   - Line 15: Replace `mockListTypes.filter()` with `await getStrategicListTypes()`
   - GET handler already async

2. **`libs/admin-pages/src/pages/non-strategic-upload/index.ts`**
   - Line 16: Replace filter with `await getNonStrategicListTypes()`
   - GET handler already async

3. **`libs/admin-pages/src/pages/remove-list-confirmation/index.ts`**
   - Line 19: Replace `mockListTypes.find()` with `await getListTypeById()`
   - GET handler already async

4. **`libs/admin-pages/src/pages/remove-list-search-results/index.ts`**
   - Lines 66, 121: Replace `mockListTypes.find()` with `await getListTypeById()`
   - Handlers already async

5. **`libs/admin-pages/src/pages/non-strategic-upload-summary/index.ts`**
   - Replace mock usage with service call
   - Handler already async

6. **`libs/admin-pages/src/pages/manual-upload-summary/index.ts`**
   - Replace mock usage with service call
   - Handler already async

7. **`libs/admin-pages/src/manual-upload/validation.ts`**
   - Line 1: Remove mock import (validation can accept listTypeId as number)
   - Validation logic doesn't need to check existence (DB constraint handles this)

#### Public Pages Module (2 files)

1. **`libs/public-pages/src/pages/summary-of-publications/index.ts`**
   - Replace `mockListTypes` with `await getAllListTypes()`
   - GET handler already async

2. **`libs/public-pages/src/flat-file/flat-file-service.ts`**
   - Replace mock usage with service calls
   - Make functions async if not already

#### API Module (2 files)

1. **`libs/api/src/blob-ingestion/repository/service.ts`**
   - Replace mock usage with `await getListTypeById()`
   - Make function async

2. **`libs/api/src/blob-ingestion/validation.ts`**
   - Replace mock array check with database query or remove check (constraint handles it)
   - Make validation async if needed

#### List Types Module (2 files)

1. **`libs/list-types/common/src/index.ts`**
   - Remove `mockListTypes` export
   - Keep `ListType` interface export (now re-exported from `@prisma/client`)

2. **`libs/list-types/civil-and-family-daily-cause-list/src/pages/index.ts`**
   - Update import to use service
   - Make handler async if not already

### Query Pattern Migration Examples

**Pattern 1: Find by ID**
```typescript
// Before
import { mockListTypes } from "@hmcts/list-types-common";
const listType = mockListTypes.find((lt) => lt.id === listTypeId);

// After
import { getListTypeById } from "@hmcts/list-types-repository";
const listType = await getListTypeById(listTypeId);
```

**Pattern 2: Filter by isNonStrategic**
```typescript
// Before
const nonStrategicTypes = mockListTypes.filter((lt) => lt.isNonStrategic);

// After
import { getNonStrategicListTypes } from "@hmcts/list-types-repository";
const nonStrategicTypes = await getNonStrategicListTypes();
```

**Pattern 3: Get all list types**
```typescript
// Before
const allTypes = mockListTypes;

// After
import { getAllListTypes } from "@hmcts/list-types-repository";
const allTypes = await getAllListTypes();
```

**Pattern 4: With Artefact queries (join optimization)**
```typescript
// Before
const artefact = await prisma.artefact.findUnique({ where: { artefactId } });
const listType = mockListTypes.find(lt => lt.id === artefact.listTypeId);

// After (optimized with include)
const artefact = await prisma.artefact.findUnique({
  where: { artefactId },
  include: { listType: true }
});
// Access: artefact.listType.englishFriendlyName
```

## 3. Error Handling & Edge Cases

### Database Constraint Violations

**Scenario:** Attempting to create an artefact with non-existent `listTypeId`
- **Handling:** Prisma will throw foreign key constraint error
- **Response:** Catch and return 400 with clear message "Invalid list type ID"

**Scenario:** Attempting to delete a list type referenced by artefacts
- **Handling:** Foreign key constraint prevents deletion
- **Response:** Database error (by design - list types should not be deleted)

### Missing Data Scenarios

**Scenario:** `getListTypeById()` returns null
- **Handling:** Check for null in calling code
- **Response:** Return 404 or appropriate error based on context

**Scenario:** Empty list from `getNonStrategicListTypes()`
- **Handling:** Return empty array (valid state)
- **Response:** Display "No list types available" message in UI

### Migration Edge Cases

**Scenario:** Existing artefacts have invalid `listTypeId` values
- **Prevention:** Run data validation query before migration:
  ```sql
  SELECT DISTINCT list_type_id
  FROM artefact
  WHERE list_type_id NOT IN (1,2,3,4,5,6,7,8,9);
  ```
- **Resolution:** If invalid IDs found, clean data or adjust migration

### Performance Edge Cases

**Scenario:** High-frequency queries for same list types
- **Current approach:** Direct database queries (9 records is minimal overhead)
- **Future optimization:** Add in-memory caching if needed (not required initially)

## 4. Acceptance Criteria Mapping

### AC1: Database stores list type information
- ✅ **Satisfied by:** Creating `list_type` table in migration
- ✅ **Satisfied by:** Seeding table with 9 existing list types
- ✅ **Verification:** Query database directly: `SELECT * FROM list_type;`

### AC2: All pages getting list type information from database
- ✅ **Satisfied by:** Updating all 18 files to use service functions
- ✅ **Verification:**
  - Search codebase for `mockListTypes` imports (should return 0 results)
  - Run all E2E tests to verify pages still function correctly
  - Manual testing: verify dropdowns and displays show correct data

### AC3: Existing functionality preserved
- ✅ **Satisfied by:** Maintaining identical data structure (same IDs and fields)
- ✅ **Satisfied by:** Preserving function return types (ListType interface unchanged)
- ✅ **Verification:**
  - All unit tests pass (after updating mocks)
  - All E2E tests pass (no changes needed)
  - Manual upload page displays list types in dropdown
  - Publication authorization still validates correctly

### AC4: Mock files removed
- ✅ **Satisfied by:** Deleting `libs/list-types/common/src/mock-list-types.ts`
- ✅ **Satisfied by:** Removing exports from `libs/list-types/common/src/index.ts`
- ✅ **Verification:**
  - File no longer exists in repository
  - No imports of `mockListTypes` remain in codebase

### AC5: Referential integrity enforced
- ✅ **Satisfied by:** Foreign key constraint in migration
- ✅ **Verification:**
  - Attempt to insert artefact with invalid listTypeId (should fail)
  - Check constraint exists: `\d artefact` in psql shows foreign key

## 5. Testing Strategy

### Unit Tests

**Pattern:** Mock Prisma client instead of mock array

```typescript
// Before
vi.mock("@hmcts/list-types-common", () => ({
  mockListTypes: [
    { id: 1, name: "CIVIL_DAILY_CAUSE_LIST", /* ... */ }
  ]
}));

// After
vi.mock("@hmcts/postgres", () => ({
  prisma: {
    listType: {
      findUnique: vi.fn(),
      findMany: vi.fn()
    }
  }
}));

// In test
vi.mocked(prisma.listType.findUnique).mockResolvedValue({
  id: 1,
  name: "CIVIL_DAILY_CAUSE_LIST",
  englishFriendlyName: "Civil Daily Cause List",
  welshFriendlyName: "Civil Daily Cause List",
  provenance: "CFT_IDAM",
  urlPath: "civil-daily-cause-list",
  isNonStrategic: false
});
```

**Files requiring test updates:**
- All test files currently importing `mockListTypes`
- Service layer tests for new list type service
- Query tests that now include list type joins

### E2E Tests

**No changes required** - E2E tests verify user-facing behavior which remains unchanged. However, verify:
- Manual upload page shows list type dropdown
- Non-strategic upload filters correctly
- Publication summary displays friendly names
- Welsh translations display correctly

### Manual Testing Checklist

- [ ] Manual upload page displays strategic list types dropdown
- [ ] Non-strategic upload page displays non-strategic list types dropdown
- [ ] Summary of publications shows correct friendly names
- [ ] Welsh translations display correctly (welshFriendlyName)
- [ ] Creating artefact with valid listTypeId succeeds
- [ ] Creating artefact with invalid listTypeId fails with constraint error
- [ ] Publication authorization validates list type correctly

## 6. Root tsconfig.json Update

Add new module to paths:

```json
{
  "compilerOptions": {
    "paths": {
      // ... existing paths ...
      "@hmcts/list-types-repository": ["libs/list-types/repository/src"]
    }
  }
}
```

## 7. CLARIFICATIONS NEEDED

### Data Migration Verification
**Question:** Should we verify existing `artefact.list_type_id` values match our seed data before establishing foreign key?

**Context:** If any existing artefacts have invalid list_type_id values (not 1-9), the foreign key constraint will fail. We should query for orphaned records before migration.

**Suggested approach:** Run validation query as part of migration script and halt if invalid IDs found.

### Performance and Caching
**Question:** Are there any high-frequency queries that would benefit from caching list types in-memory?

**Context:** List types are relatively static reference data (9 records). Database queries should be fast, but if we see performance issues, we could implement caching.

**Suggested approach:** Start without caching. Add if performance monitoring shows issues.

### Future Management
**Question:** Should we build an admin UI for managing list types, or continue using database migrations?

**Context:** Currently, adding/updating list types requires a database migration. If list types need to change frequently, an admin UI might be beneficial.

**Suggested approach:** Continue with migrations for now (list types are relatively stable). Build admin UI as separate ticket if needed.

### Soft Delete Strategy
**Question:** Should list types support soft deletion (is_active flag) rather than hard deletion?

**Context:** Foreign key constraint prevents deleting list types in use. If we need to "retire" list types while preserving history, soft delete might be better.

**Suggested approach:** Don't implement soft delete now. List types should rarely be deleted. If needed, can be added later.
