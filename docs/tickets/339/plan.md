# Technical Plan: Add Flat-File Only List Type Flag

## Overview

This ticket implements support for list types that only accept flat files (PDF, CSV, Excel, etc.) and do not support JSON schema validation. The implementation requires:

1. **Database migration** to add `is_flat` column to a new `list_type` table
2. **API validation** to reject JSON payloads for flat-file-only list types
3. **Admin UI** for configuring list types with the `is_flat` flag
4. **Upload validation** to enforce flat-file-only restrictions in manual upload flows

**Key reconciliation of requirements:**
- Original issue specifies `is_flat` (database field name) not `flatFileOnly`
- Previous spec focused only on manual upload; original requirement includes API endpoint and admin UI
- "configure-list-type-enter-details" is a new page that needs to be created
- List types must move from in-memory (`mockListTypes`) to database storage

## Technical Approach

### 1. Database Schema Changes

Create a new `list_type` table to persist list type configuration. This replaces the current in-memory `mockListTypes` array.

**New table structure:**
```prisma
model ListType {
  id                   Int      @id @default(autoincrement())
  name                 String   @unique
  englishFriendlyName  String   @map("english_friendly_name")
  welshFriendlyName    String   @map("welsh_friendly_name")
  provenance           String
  urlPath              String?  @map("url_path")
  isNonStrategic       Boolean  @map("is_non_strategic")
  isFlat               Boolean  @default(false) @map("is_flat")
  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @updatedAt @map("updated_at")

  @@map("list_type")
}
```

**Migration strategy:**
1. Create `list_type` table with seed data from `mockListTypes`
2. Update all code to query database instead of using `mockListTypes`
3. Add `isFlat` field with default `false` for backward compatibility
4. Keep `mockListTypes` temporarily for backward compatibility during migration

### 2. API Changes

**File:** `libs/api/src/routes/v1/publication.ts`

Modify the `/publication` endpoint to reject JSON payloads when `list_type` has `is_flat = true`.

**Logic:**
```typescript
// In isBlobIngestionRequest type guard or validation
const listType = await getListTypeByName(req.body.list_type);
if (listType?.isFlat && req.body.hearing_list !== undefined) {
  return res.status(400).json({
    success: false,
    message: "This list type only accepts flat file uploads. JSON payloads are not allowed."
  });
}
```

**File:** `libs/api/src/blob-ingestion/validation.ts`

Skip JSON schema validation for flat-file-only list types:

```typescript
// Line 132 - before validateListTypeJson
const listType = mockListTypes.find(lt => lt.id === validation.listTypeId);
if (listType?.isFlat) {
  // Skip JSON validation for flat-file-only list types
  return {
    isValid: errors.length === 0,
    errors,
    locationExists,
    listTypeId: validation.listTypeId
  };
}
```

### 3. Admin UI - Configure List Type Page

**New page:** `libs/admin-pages/src/pages/configure-list-type-enter-details/`

This page allows system admins to configure list type properties including the `is_flat` flag.

**URL:** `/configure-list-type-enter-details`

**Form fields:**
- List type name (dropdown - select existing or enter new)
- English friendly name (text input)
- Welsh friendly name (text input)
- Provenance (dropdown - CFT_IDAM, CRIME_IDAM, MANUAL_UPLOAD, etc.)
- URL path (text input, optional)
- Is flat file only (radio buttons - Yes/No)
- Is non-strategic (radio buttons - Yes/No, **disabled if is_flat = true**)

**Business rule:** If user selects "Yes" for "Is flat file only", automatically set "Is non-strategic" to "No" and disable the radio button.

**Controller logic:**
```typescript
export const GET = async (req: Request, res: Response) => {
  // Load existing list types for dropdown
  const listTypes = await getAllListTypes();
  res.render("configure-list-type-enter-details/index", { listTypes, ... });
};

export const POST = async (req: Request, res: Response) => {
  // Validation
  // If isFlat === true, force isNonStrategic to false
  if (req.body.isFlat === 'true') {
    req.body.isNonStrategic = 'false';
  }

  // Create or update list type in database
  await upsertListType(req.body);
  res.redirect("/configure-list-type-success");
};
```

**Frontend interaction:**
- JavaScript progressive enhancement to disable "Is non-strategic" radio when "Is flat" is selected
- Without JavaScript, server-side validation enforces the rule

### 4. Manual Upload Validation

**File:** `libs/admin-pages/src/manual-upload/validation.ts`

Add validation to reject JSON files for flat-file-only list types:

```typescript
// Line 126 - before validateJsonFileSchema
const listType = mockListTypes.find(lt => lt.id === Number.parseInt(body.listType, 10));

if (listType?.isFlat && file?.originalname?.endsWith('.json')) {
  errors.push({
    text: errorMessages.flatFileOnlyType,
    href: '#file'
  });
  return errors; // Skip JSON validation
}
```

**Error messages:**
- English: "This list type only accepts flat files (PDF, CSV, Excel, etc.). JSON files are not allowed."
- Welsh: "Mae'r math hwn o restr yn derbyn ffeiliau fflat yn unig (PDF, CSV, Excel, ac ati). Ni chaniateir ffeiliau JSON."

### 5. Data Access Layer

**New file:** `libs/list-types/common/src/list-type-queries.ts`

```typescript
export async function getAllListTypes(): Promise<ListType[]> {
  return prisma.listType.findMany({
    orderBy: { name: 'asc' }
  });
}

export async function getListTypeById(id: number): Promise<ListType | null> {
  return prisma.listType.findUnique({ where: { id } });
}

export async function getListTypeByName(name: string): Promise<ListType | null> {
  return prisma.listType.findUnique({ where: { name } });
}

export async function upsertListType(data: UpsertListTypeInput): Promise<ListType> {
  return prisma.listType.upsert({
    where: { name: data.name },
    create: data,
    update: data
  });
}
```

## Implementation Details

### File Structure

```
libs/admin-pages/src/pages/configure-list-type-enter-details/
├── index.ts              # Controller
├── index.njk             # Template
├── index.test.ts         # Tests
├── en.ts                 # English content
└── cy.ts                 # Welsh content

libs/list-types/common/src/
├── list-type-queries.ts       # Database queries
├── list-type-queries.test.ts  # Query tests
└── list-type-service.ts       # Business logic (optional)

apps/postgres/prisma/
└── migrations/
    └── YYYYMMDDHHMMSS_create_list_type_table/
        └── migration.sql
```

### Migration Strategy

**Phase 1:** Add database table and queries
- Create `list_type` table via Prisma migration
- Seed with existing `mockListTypes` data
- Create query functions in `list-type-queries.ts`

**Phase 2:** Update consumers
- Update all code that reads `mockListTypes` to use database queries
- Update API validation to use database
- Update manual upload to use database

**Phase 3:** Add admin UI
- Create configure list type page
- Add validation and business rules
- Add progressive enhancement JavaScript

**Phase 4:** Deprecate mockListTypes
- Remove `mockListTypes` export once all consumers migrated
- Keep file for backward compatibility reference

### Validation Rules

**configure-list-type-enter-details page:**
- Name: Required, unique, alphanumeric with underscores
- English friendly name: Required, max 100 characters
- Welsh friendly name: Required, max 100 characters
- Provenance: Required, must be in allowed list
- Is flat: Required, boolean
- Is non-strategic: Required if `is_flat = false`, auto-set to `false` if `is_flat = true`

**Manual upload validation:**
- If `list_type.is_flat = true` and file extension is `.json`, reject with error
- If `list_type.is_flat = false`, proceed with existing JSON validation

**API /publication validation:**
- If `list_type.is_flat = true` and `hearing_list` field is present, reject with 400 error
- If `list_type.is_flat = false`, proceed with existing JSON validation

## Error Handling & Edge Cases

### Database Migration
- **Edge case:** Migration fails mid-way - Prisma handles rollback automatically
- **Edge case:** Duplicate list type names during seed - Use `ON CONFLICT` clause in seed script

### API Validation
- **Edge case:** List type not found - Return 400 with "Invalid list type" message
- **Edge case:** List type exists but `is_flat` is null - Treat as `false` (backward compatibility)
- **Edge case:** JSON payload sent to flat-file-only type - Return 400 with descriptive error

### Admin UI
- **Edge case:** User selects existing list type and changes `is_flat` - Show confirmation dialog
- **Edge case:** JavaScript disabled - Server-side validation enforces is_non_strategic rule
- **Edge case:** Concurrent updates - Use optimistic locking with `updatedAt` field

### Manual Upload
- **Edge case:** File extension check bypassed - Server validates MIME type as well
- **Edge case:** Large files - Existing file size validation still applies
- **Edge case:** User uploads non-JSON to JSON-supporting type - Allow (backward compatibility)

## Acceptance Criteria Mapping

| Original AC | Implementation |
|-------------|----------------|
| Functionality to support flat file list type developed | Database table, API validation, UI, upload validation |
| New flag created and stored in CaTH backend | `is_flat` column in `list_type` table |
| List types assigned flags in frontend to identify flat file only | Configure list type page with radio buttons |
| Default is set to 'Is not' since most list types are not flat-file-only | Database default `false` for `is_flat` column |
| Manual upload/Admin screens not affected | Validation added but UI unchanged (error message only) |
| API endpoint /publication must not accept JSON for is_flat list types | Validation in `publication.ts` route handler |
| On configure-list-type-enter-details page, disable "is non-strategic" if is_flat selected | JavaScript progressive enhancement + server validation |

## Open Questions (CLARIFICATIONS NEEDED)

### 1. List Type Management Permissions
**Question:** Who should have access to the configure-list-type-enter-details page?
- System admins only?
- System admins + CTSC admins?
- Requires new permission level?

**Recommendation:** System admins only (`USER_ROLES.SYSTEM_ADMIN`)

### 2. Editing Existing List Types
**Question:** Should admins be able to edit existing list types that already have publications?
- Allow editing any time (could break existing publications)?
- Prevent editing if publications exist?
- Show warning but allow override?

**Recommendation:** Show warning if publications exist, require confirmation to proceed

### 3. URL Path Generation
**Question:** Should URL path be auto-generated from the name or manually entered?
- Auto-generate from English friendly name (e.g., "Civil Daily Cause List" → "civil-daily-cause-list")?
- Allow manual override?
- Leave optional?

**Recommendation:** Auto-generate with manual override option

### 4. Flat File Handling in API
**Question:** Should the API `/publication` endpoint accept flat file binary data for `is_flat = true` list types?
- Accept binary file data in a different field?
- Reject all `/publication` requests for flat types (require manual upload only)?
- Support base64-encoded file uploads?

**Recommendation:** Clarify with stakeholders - likely reject all JSON requests, flat files via manual upload only

### 5. Non-Strategic and Flat File Relationship
**Question:** Why must flat-file-only list types NOT be non-strategic?
- Business rule context?
- Technical constraint?

**Recommendation:** Document business reasoning for this rule

### 6. Migration of Existing List Types
**Question:** Should we migrate all existing list types from `mockListTypes` to the database immediately?
- Yes, in the same ticket?
- No, keep mock data and gradually migrate?
- Hybrid approach with fallback?

**Recommendation:** Migrate all in this ticket, seed database with current data

### 7. Display of Flat Files
**Question:** How should flat files be displayed to end users?
- Download link only?
- Inline viewer for PDFs?
- Preview for Excel/CSV?

**Recommendation:** Out of scope for this ticket - maintain existing flat file display behavior

### 8. Validation Error Location
**Question:** Where should we show the "JSON not allowed" error in the API response?
- As a field-level error on `hearing_list`?
- As a general validation error?
- As a specific HTTP 400 message?

**Recommendation:** Return 400 with clear message in response body `{ success: false, message: "..." }`

## Testing Strategy

### Unit Tests
- `list-type-queries.test.ts` - Database query functions
- `configure-list-type-enter-details/index.test.ts` - Page controller
- `validation.test.ts` (manual upload) - Flat file validation logic
- `publication.test.ts` (API) - API rejection of JSON for flat types

### Integration Tests
- Create list type via admin UI → Upload JSON to flat type → Verify rejection
- Create list type via admin UI → Upload PDF to flat type → Verify success
- API call with JSON payload to flat type → Verify 400 response

### E2E Tests (Playwright)
- Admin creates new flat-file-only list type
- Admin attempts to upload JSON file to flat-file-only type → sees error
- Admin uploads PDF to flat-file-only type → success
- Verify "is non-strategic" disabled when "is flat" selected (JavaScript)
- Verify server-side enforcement when JavaScript disabled

### Database Tests
- Migration creates table correctly
- Seed data populates all existing list types
- Unique constraint prevents duplicate names
- Default value for `is_flat` is false

## Dependencies

- **Prisma migration** must complete before query functions can be used
- **List type queries** must be implemented before admin UI can be built
- **Admin UI** should be built before validation logic to allow testing
- **All consumers** of `mockListTypes` must be updated before deprecating it

## Performance Considerations

- List types are read frequently (every upload, every publication display)
- Cache list types in memory with periodic refresh
- Add database index on `name` column (unique constraint provides this)
- Consider adding index on `is_flat` if we frequently filter by this field

## Security Considerations

- Only system admins can access configure-list-type-enter-details page
- Validate all inputs to prevent SQL injection (Prisma handles this)
- Sanitize list type name to prevent XSS in dropdowns
- Audit log for list type changes (future enhancement)

## Rollback Plan

1. If issues found post-deployment:
   - Revert database migration (rollback to previous schema)
   - Re-enable `mockListTypes` as primary source
   - Disable admin UI page (remove from navigation)

2. Rollback steps:
   ```bash
   # Revert migration
   yarn db:migrate:rollback

   # Deploy previous version
   git revert <commit-hash>

   # Restart services
   yarn restart
   ```

## Future Enhancements (Out of Scope)

- Audit logging for list type configuration changes
- Bulk import/export of list type configurations
- Versioning of list type schemas
- Soft delete for list types with existing publications
- API endpoint for programmatic list type management
- Advanced validation rules per list type (e.g., required fields, file size limits)
