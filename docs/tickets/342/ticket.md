# #342: Refactor the code to use List information from the database table

**State:** OPEN
**Assignees:**
**Author:** junaidiqbalmoj
**Labels:** type:epic
**Created:** 2026-02-11T11:41:46Z
**Updated:** 2026-02-12T21:36:03Z

## Description

Currently, lots of pages are getting list information from mock file. We need to update the code so that all the list information comes for list type database tables.

**Acceptance criteria:**

- All pages are getting list type information from database
- list type mock file has been deleted from the code repository.

## Comments

### Comment by OgechiOkelu on 2026-02-12T16:36:39Z
@SPEC new-feature.md

### Comment by hmctsclaudecode on 2026-02-12T16:40:18Z
## 1. User Story
**As a** developer
**I want to** store list type information in the database
**So that** list types can be managed dynamically without code changes and maintain referential integrity

## 2. Background

Currently, list type information is stored in a mock file at `libs/list-types/common/src/mock-list-types.ts` containing 9 hardcoded list types. The codebase references this mock data in 18 different locations across multiple modules including publication queries, admin pages, API validation, and authorization middleware.

The `Artefact` table stores `listTypeId` as an integer with no foreign key relationship, creating referential integrity issues. This refactor will:
1. Create a proper `list_type` database table
2. Establish foreign key relationships
3. Replace all mock file imports with database queries
4. Enable dynamic list type management

## 3. Acceptance Criteria

* **Scenario:** Database stores list type information
    * **Given** a new `list_type` table exists in the database
    * **When** applications query for list types
    * **Then** data is returned from the database instead of mock files

* **Scenario:** Existing functionality preserved
    * **Given** all 18 files currently using mockListTypes
    * **When** refactored to use database queries
    * **Then** all existing functionality works identically

* **Scenario:** Mock files removed
    * **Given** all code refactored to use database
    * **When** checking the repository
    * **Then** `libs/list-types/common/src/mock-list-types.ts` no longer exists

* **Scenario:** Referential integrity enforced
    * **Given** the `artefact` table references `list_type`
    * **When** attempting to delete a list type in use
    * **Then** database constraint prevents orphaned records

## 4. User Journey Flow

This is a backend refactor with no user-facing journey changes. The technical flow is:

```
┌─────────────────────────────────────────────────────┐
│ Current State: Code → mockListTypes array          │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Future State: Code → Database → list_type table    │
└─────────────────────────────────────────────────────┘

Query Pattern Change:
┌────────────────────────────────────────────────┐
│ BEFORE:                                        │
│ const listType = mockListTypes.find(          │
│   lt => lt.id === listTypeId                  │
│ )                                              │
└────────────────────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────────┐
│ AFTER:                                         │
│ const listType = await prisma.listType.findUnique({ │
│   where: { id: listTypeId }                   │
│ })                                             │
└────────────────────────────────────────────────┘
```

## 5. Low Fidelity Wireframe

Not applicable - backend refactor with no UI changes.

## 6. Page Specifications

No page changes required. All 18 files using list types will continue to work identically.

**Files Requiring Updates:**
- **Publication Module (4 files):**
  - `libs/publication/src/repository/queries.ts` (lines 182, 204)
  - `libs/publication/src/repository/service.ts` (line 60)
  - `libs/publication/src/authorisation/middleware.ts` (line 87)
  - `libs/publication/src/index.ts` (exports)

- **Admin Pages Module (8 files):**
  - `libs/admin-pages/src/pages/manual-upload/index.ts` (line 15)
  - `libs/admin-pages/src/pages/non-strategic-upload/index.ts` (line 16)
  - `libs/admin-pages/src/pages/remove-list-confirmation/index.ts` (line 19)
  - `libs/admin-pages/src/pages/remove-list-search-results/index.ts` (lines 66, 121)
  - `libs/admin-pages/src/pages/non-strategic-upload-summary/index.ts`
  - `libs/admin-pages/src/pages/manual-upload-summary/index.ts`
  - `libs/admin-pages/src/manual-upload/validation.ts` (line 1)

- **Public Pages Module (2 files):**
  - `libs/public-pages/src/pages/summary-of-publications/index.ts`
  - `libs/public-pages/src/flat-file/flat-file-service.ts`

- **API Module (2 files):**
  - `libs/api/src/blob-ingestion/repository/service.ts`
  - `libs/api/src/blob-ingestion/validation.ts`

- **List Types Module (2 files):**
  - `libs/list-types/common/src/index.ts` (exports)
  - `libs/list-types/civil-and-family-daily-cause-list/src/pages/index.ts`

## 7. Content

No content changes - this is a backend refactor.

## 8. URL

No URL changes.

## 9. Validation

No new validation rules. Existing validation in upload forms and API ingestion will continue to validate `listTypeId` exists, but will query the database instead of the mock array.

## 10. Error Messages

No new error messages. Existing error handling for invalid list types remains unchanged.

## 11. Navigation

No navigation changes.

## 12. Accessibility

No accessibility impact - backend refactor only.

## 13. Test Scenarios

* Verify all existing unit tests continue to pass with database-backed list types
* Verify manual upload page displays list types from database in dropdown
* Verify non-strategic upload page filters list types correctly (isNonStrategic=true)
* Verify publication authorization middleware retrieves list type from database
* Verify API blob ingestion validates list types against database
* Verify summary of publications page displays correct friendly names
* Verify artefact creation with valid listTypeId succeeds
* Verify artefact creation with invalid listTypeId fails with foreign key constraint error
* Verify removing a list type in use by artefacts fails gracefully
* Verify Welsh translations (welshFriendlyName) display correctly from database

## 14. Assumptions & Open Questions

### Assumptions
* The 9 existing list types in the mock file represent the complete current list
* List type IDs (1-9) should be preserved for backward compatibility with existing artefact records
* No new list types need to be added immediately (can be added later via migrations or admin interface)
* The ListType interface fields are complete and sufficient
* Synchronous array operations (`.find()`, `.filter()`) can be replaced with async database queries throughout

### Open Questions
* **Data Migration:** Should we verify existing `artefact.list_type_id` values match our seed data before establishing foreign key?
* **Performance:** Are there any high-frequency queries that would benefit from caching list types in-memory?
* **Future Management:** Should we build an admin UI for managing list types, or continue using database migrations?
* **Soft Delete:** Should list types support soft deletion (is_active flag) rather than hard deletion?

---

## Technical Implementation Details

### Database Schema Changes

**New Prisma Model:**
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

**Updated Artefact Model:**
```prisma
model Artefact {
  artefactId        String          @id @default(uuid()) @map("artefact_id") @db.Uuid
  locationId        String          @map("location_id")
  listTypeId        Int             @map("list_type_id")
  listType          ListType        @relation(fields: [listTypeId], references: [id])
  // ... other fields remain unchanged

  @@map("artefact")
}
```

### Query Pattern Changes

**Pattern 1: Find by ID**
```typescript
// Before
const listType = mockListTypes.find((lt) => lt.id === listTypeId);

// After
const listType = await prisma.listType.findUnique({
  where: { id: listTypeId }
});
```

**Pattern 2: Filter by isNonStrategic**
```typescript
// Before
const nonStrategicTypes = mockListTypes.filter((lt) => lt.isNonStrategic);

// After
const nonStrategicTypes = await prisma.listType.findMany({
  where: { isNonStrategic: true }
});
```

**Pattern 3: Get all list types**
```typescript
// Before
const allTypes = mockListTypes;

// After
const allTypes = await prisma.listType.findMany();
```

**Pattern 4: Join with Artefact queries**
```typescript
// Before (separate queries)
const artefact = await prisma.artefact.findUnique({ where: { artefactId } });
const listType = mockListTypes.find(lt => lt.id === artefact.listTypeId);

// After (single query with include)
const artefact = await prisma.artefact.findUnique({
  where: { artefactId },
  include: { listType: true }
});
// Access: artefact.listType.englishFriendlyName
```

### Service Layer Pattern

Create a new service module: `libs/list-types/common/src/repository/service.ts`

```typescript
import { prisma } from "@hmcts/postgres";
import type { ListType } from "@prisma/client";

export async function getAllListTypes(): Promise<ListType[]> {
  return prisma.listType.findMany();
}

export async function getListTypeById(id: number): Promise<ListType | null> {
  return prisma.listType.findUnique({ where: { id } });
}

export async function getNonStrategicListTypes(): Promise<ListType[]> {
  return prisma.listType.findMany({
    where: { isNonStrategic: true }
  });
}

export async function getStrategicListTypes(): Promise<ListType[]> {
  return prisma.listType.findMany({
    where: { isNonStrategic: false }
  });
}
```

### Migration Strategy

1. **Create migration file** with list_type table and seed data
2. **Add foreign key** to artefact table referencing list_type
3. **Update all imports** from `mockListTypes` to new service functions
4. **Update function signatures** to be async where needed
5. **Update tests** to mock Prisma client instead of mock array
6. **Delete mock-list-types.ts** file
7. **Remove exports** from `libs/list-types/common/src/index.ts`

### Performance Considerations

**Caching Strategy (Optional):**
Since list types change infrequently, consider implementing in-memory caching:

```typescript
let listTypeCache: ListType[] | null = null;

export async function getAllListTypes(useCache = true): Promise<ListType[]> {
  if (useCache && listTypeCache) {
    return listTypeCache;
  }

  listTypeCache = await prisma.listType.findMany();
  return listTypeCache;
}

export function clearListTypeCache(): void {
  listTypeCache = null;
}
```

### Testing Strategy

**Unit Test Updates:**
```typescript
// Before
vi.mock("@hmcts/list-types-common", () => ({
  mockListTypes: [/* test data */]
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

// In tests
vi.mocked(prisma.listType.findUnique).mockResolvedValue({
  id: 1,
  name: "CIVIL_DAILY_CAUSE_LIST",
  englishFriendlyName: "Civil Daily Cause List",
  // ... other fields
});
```

**E2E Tests:**
No changes needed to E2E tests - they test user-facing behavior which remains unchanged. The global setup may need to verify list_type seed data is loaded.

---

## Implementation Checklist

- [ ] Create Prisma migration for list_type table
- [ ] Seed list_type table with 9 existing list types
- [ ] Add foreign key constraint to artefact.list_type_id
- [ ] Create list type repository/service functions
- [ ] Update publication module (4 files)
- [ ] Update admin-pages module (8 files)
- [ ] Update public-pages module (2 files)
- [ ] Update api module (2 files)
- [ ] Update list-types module (2 files)
- [ ] Update all unit tests to mock Prisma instead of mockListTypes
- [ ] Verify all E2E tests pass
- [ ] Delete libs/list-types/common/src/mock-list-types.ts
- [ ] Remove mock-list-types exports from index.ts
- [ ] Update documentation if any references mock files

### Comment by OgechiOkelu on 2026-02-12T21:36:03Z
@plan
