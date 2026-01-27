# VIBE-357: Rolls Building and RCJ Landing Page Caution and No List Message

## Technical Approach

This feature adds dynamic location-specific metadata management for displaying caution and "no list" messages on the Summary of Publications page. The implementation follows the established monorepo module pattern with:

1. **Database extension**: Extend `libs/location` with new `location_metadata` table and business logic
2. **Admin pages**: New pages in `libs/system-admin-pages/src/pages` for the admin UI workflow
3. **Frontend integration**: Update `summary-of-publications` page to display messages based on publication availability

### Architecture Decisions

- **Module placement**:
  - Database schema and business logic in existing `libs/location` module
  - Admin pages in existing `libs/system-admin-pages/src/pages`
- **Business logic separation**: Service layer for CRUD operations, separate from HTTP handlers
- **Data retrieval**: Queries in dedicated repository layer with Prisma
- **Session management**: Use existing Express session for multi-step form flow
- **Validation**: Input validation at service layer, not in routes
- **Pattern consistency**: Follow existing patterns from `delete-court` for search → manage → confirm → success flow

### Key Technical Considerations

1. **Relationship to existing system**: The tile "Manage Location Metadata" already exists in `system-admin-dashboard/en.ts` (line 40-43), but points to `/location-metadata` which doesn't exist yet
2. **Message display logic**: Must check if publications exist to determine which messages to show:
   - Publications exist: Show caution message only
   - No publications: Show both caution and no list messages
3. **Bilingual support**: All content must have English and Welsh versions (both in database and UI)
4. **Autocomplete integration**: Reuse existing search-autocomplete component from web-core
5. **Authorization**: All admin pages require `USER_ROLES.SYSTEM_ADMIN` role check

## Implementation Details

### File Structure

```
libs/location/
├── prisma/
│   └── schema.prisma                          # Add location_metadata table definition
└── src/
    ├── index.ts                               # Add location-metadata exports
    ├── repository/
    │   ├── model.ts                           # Add LocationMetadata types/interfaces
    │   ├── location-metadata-queries.ts       # Database queries with Prisma
    │   └── location-metadata-service.ts       # Business logic (create, update, delete, get)
    └── validation/
        └── location-metadata-validation.ts    # Input validation functions

libs/system-admin-pages/src/pages/
├── location-metadata-search/
│   ├── index.ts                               # GET/POST handlers for search
│   ├── index.njk                              # Search page template
│   ├── en.ts                                  # English content
│   └── cy.ts                                  # Welsh content
├── location-metadata-manage/
│   ├── index.ts                               # GET/POST handlers for create/update
│   ├── index.njk                              # Management form template
│   ├── en.ts                                  # English content
│   └── cy.ts                                  # Welsh content
├── location-metadata-success/
│   ├── index.ts                               # GET handler for success page
│   ├── index.njk                              # Success page template
│   ├── en.ts                                  # English content
│   └── cy.ts                                  # Welsh content
└── location-metadata-delete-confirmation/
    ├── index.ts                               # GET/POST handlers for delete confirm
    ├── index.njk                              # Delete confirmation template
    ├── en.ts                                  # English content
    └── cy.ts                                  # Welsh content
```

### Database Schema Changes

**New table: `location_metadata`**

```prisma
model LocationMetadata {
  locationMetadataId   String   @id @default(cuid()) @map("location_metadata_id")
  locationId           Int      @unique @map("location_id")
  cautionMessage       String?  @map("caution_message") @db.Text
  welshCautionMessage  String?  @map("welsh_caution_message") @db.Text
  noListMessage        String?  @map("no_list_message") @db.Text
  welshNoListMessage   String?  @map("welsh_no_list_message") @db.Text
  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @updatedAt @map("updated_at")

  location Location @relation(fields: [locationId], references: [locationId], onDelete: Cascade)

  @@map("location_metadata")
}
```

**Update to Location model** (add relation):
```prisma
model Location {
  // ... existing fields
  locationMetadata LocationMetadata?
}
```

### Components/Modules to Create

#### 1. Location Metadata Service (`libs/location/src/repository/location-metadata-service.ts`)
```typescript
// Exported functions:
- getLocationMetadataByLocationId(locationId: number): Promise<LocationMetadata | null>
- createLocationMetadata(data: CreateLocationMetadataInput): Promise<LocationMetadata>
- updateLocationMetadata(locationId: number, data: UpdateLocationMetadataInput): Promise<LocationMetadata>
- deleteLocationMetadata(locationId: number): Promise<void>
```

#### 2. Location Metadata Queries (`libs/location/src/repository/location-metadata-queries.ts`)
```typescript
// Database access layer:
- findLocationMetadataByLocationId(locationId: number)
- createLocationMetadataRecord(data)
- updateLocationMetadataRecord(locationId, data)
- deleteLocationMetadataRecord(locationId)
```

#### 3. Validation (`libs/location/src/validation/location-metadata-validation.ts`)
```typescript
// Validation functions:
- validateLocationMetadataInput(data): validates at least one message is present
- validateLocationSelected(locationId): checks location exists
```

#### 4. Model Types (`libs/location/src/repository/model.ts`)
```typescript
// Add to existing model.ts:
- LocationMetadata interface
- CreateLocationMetadataInput type
- UpdateLocationMetadataInput type
```

#### 5. Page Controllers
- **location-metadata-search**: Search page with autocomplete (pattern: delete-court)
- **location-metadata-manage**: Form with 4 textareas + conditional buttons
- **location-metadata-success**: Generic success page showing operation result
- **location-metadata-delete-confirmation**: Yes/No radio confirmation

### Session Structure

```typescript
interface LocationMetadataSession {
  locationMetadata?: {
    locationId: number;
    locationName: string;
    locationWelshName: string;
    operation?: 'created' | 'updated' | 'deleted';
  };
}
```

### Frontend Changes

#### Update Summary of Publications Page

**Controller changes** (`libs/public-pages/src/pages/summary-of-publications/index.ts`):
1. Query location metadata after fetching location
2. Pass caution/no-list messages to template
3. Determine which messages to show based on publications array length

**Template changes** (`libs/public-pages/src/pages/summary-of-publications/index.njk`):
1. Add caution message display after title, before publications list
2. Add no-list message display when no publications exist
3. Messages should be wrapped in appropriate GOV.UK typography classes

### System Admin Dashboard Update

**Already exists** in `libs/system-admin-pages/src/pages/system-admin-dashboard/en.ts`:
```typescript
{
  title: "Manage Location Metadata",
  description: "View, update and remove location metadata",
  href: "/location-metadata"
}
```

**Action needed**: Update href to `/location-metadata-search` to match new route

## Error Handling & Edge Cases

### Potential Error Scenarios

1. **No location selected in search**
   - Validation: Show error "Select a location" (English) / "Dewiswch leoliad" (Welsh)
   - Prevent form submission until location selected

2. **Invalid location ID**
   - Validation: Show error "Location not found"
   - Redirect to search page

3. **No messages provided on create/update**
   - Validation: At least one of the four message fields must be populated
   - Error message: "Enter at least one message" (English) / "Rhowch o leiaf un neges" (Welsh)

4. **Database errors**
   - Catch and log all Prisma errors
   - Show generic error page to user
   - Specific handling for:
     - Duplicate key violation (shouldn't happen with unique constraint)
     - Foreign key violation (location doesn't exist)
     - Connection errors

5. **Session expiry**
   - Redirect to search page if session data missing on confirmation/success pages
   - Re-fetch data from database if needed

6. **Concurrent updates**
   - Use Prisma's updatedAt field to track last modification
   - Consider optimistic locking if needed (not in initial scope)

7. **Location deletion**
   - ON DELETE CASCADE ensures metadata is removed when location is deleted
   - No additional handling needed

### Validation Requirements

#### At Service Layer
```typescript
// Input validation for create/update
function validateMetadataInput(data: MetadataInput): ValidationResult {
  const hasAtLeastOneMessage =
    data.cautionMessage ||
    data.welshCautionMessage ||
    data.noListMessage ||
    data.welshNoListMessage;

  if (!hasAtLeastOneMessage) {
    return { valid: false, error: 'At least one message required' };
  }

  return { valid: true };
}
```

#### At Route Layer
- Location ID must be numeric
- Location must exist in database
- User must have SYSTEM_ADMIN role

### Edge Cases to Handle

1. **Empty string vs null**
   - Treat empty strings as null in database
   - Trim all input before saving

2. **Very long messages**
   - Use TEXT type in database (no length limit)
   - Consider adding character count in UI (not in initial scope)
   - No frontend validation on length

3. **Special characters in messages**
   - Allow all characters (including HTML special chars)
   - Nunjucks auto-escapes output, so no XSS risk
   - No sanitization needed

4. **Location without metadata**
   - getLocationMetadataByLocationId returns null
   - Show "Create" button in manage page
   - Don't show any messages on summary page

5. **Partial Welsh translations**
   - Allow saving with only English or only Welsh messages
   - Display logic: show message if it exists in current locale, otherwise don't show
   - Validation only requires ONE message across all four fields

6. **Browser back button**
   - Session data persists, so back button should work fine
   - GET handlers should not rely solely on session data
   - Always re-fetch from database when displaying existing metadata

## Acceptance Criteria Mapping

### AC1: Admin Dashboard Tile ✅
**Requirement**: Add tile on System Admin Dashboard
**Implementation**:
- Tile already exists in `system-admin-dashboard/en.ts` and `cy.ts`
- Update href from `/location-metadata` to `/location-metadata-search`
**Verification**:
- Navigate to `/system-admin-dashboard` as system admin
- Tile visible with correct title and description
- Clicking tile redirects to search page

### AC2: Location Search Page ✅
**Requirement**: Search page with autocomplete at `/location-metadata-search`
**Implementation**:
- Create page following `delete-court/index.ts` pattern
- Use autocomplete input with `data-autocomplete="true"`
- Continue button submits form, validates location selection
- Redirect to `/location-metadata-manage?locationId={id}` on success
**Verification**:
- Search page loads with autocomplete input
- Type location name, suggestions appear
- Select location, click Continue
- Redirected to management page with correct location

### AC3: Location Metadata Management Page ✅
**Requirement**: Management page at `/location-metadata-manage` with 4 textareas and conditional buttons
**Implementation**:
- GET handler: Fetch location by ID, fetch existing metadata (if any), render form
- 4 textarea fields using GOV.UK textarea component
- Conditional rendering: if metadata exists, show Update + Delete buttons; else show Create button
- POST handler: Validate input, call service.create or service.update, redirect to success
**Verification**:
- Navigate to page with locationId query param
- For new location: Shows empty form with Create button
- For existing: Shows pre-filled form with Update and Delete buttons
- Submit valid data → redirected to success page
- Submit invalid data → error summary shown

### AC4: Success Page ✅
**Requirement**: Success page after Create/Update operations
**Implementation**:
- Single page handling three operations: created, updated, deleted
- Panel shows appropriate message based on operation (from session)
- Link returns to search page
**Verification**:
- After create: Panel shows "Location metadata created"
- After update: Panel shows "Location metadata updated"
- After delete: Panel shows "Location metadata deleted"
- Link navigates back to search page

### AC5: Delete Confirmation Page ✅
**Requirement**: Confirmation page at `/location-metadata-delete-confirmation` with Yes/No radios
**Implementation**:
- GET handler: Check session for location details, render confirmation form
- POST handler: If "yes", delete metadata and redirect to success; if "no", redirect to manage
- Use GOV.UK radios component
**Verification**:
- Click Delete button on manage page → redirected to confirmation
- Select Yes, submit → metadata deleted, success page shown
- Select No, submit → returned to manage page

### AC6: Database Schema ✅
**Requirement**: Create `location_metadata` table with specified fields
**Implementation**:
- Prisma schema with all required fields
- Foreign key to location table with CASCADE delete
- Unique constraint on locationId (one-to-one relationship)
**Verification**:
- Run migration: `yarn db:migrate:dev`
- Check table exists in Prisma Studio
- Verify foreign key constraint and unique constraint

### AC7: Caution Message Display ✅
**Requirement**: Display caution message under FaCT link, above hearing lists
**Implementation**:
- In summary-of-publications controller: fetch metadata by locationId
- Pass cautionMessage/welshCautionMessage to template
- In template: if message exists AND publications.length > 0, display message
- Position: after page title, before publications list
**Verification**:
- Navigate to RCJ or Rolls Building summary page with publications
- Caution message visible
- Message positioned correctly
- Welsh version shows when ?lng=cy

### AC8: No List Message Display ✅
**Requirement**: Display when no publication is available
**Implementation**:
- In template: if publications.length === 0 AND noListMessage exists, display message
- Show both caution and no-list messages when no publications
**Verification**:
- Navigate to location with no publications
- Both caution and no-list messages visible (if metadata exists)
- Only no-list message shown if only that is configured

### AC9: Data Management ✅
**Requirement**: No hardcoding, data from database
**Implementation**:
- All messages stored in location_metadata table
- Summary page queries table for each location
- Service layer handles all CRUD operations
**Verification**:
- No hardcoded messages in code
- Messages pulled from database dynamically
- Changing message in admin portal reflects immediately on summary page

### AC10: Validation Rules ✅
**Requirement**: At least one message must be entered
**Implementation**:
- Validation function checks all four fields
- At least one must be non-empty after trimming
- Show error if validation fails
**Verification**:
- Try to create metadata with all fields empty → error shown
- Enter one message → validation passes
- Update to remove all messages → error shown

### AC11: Display Logic ✅
**Requirement**: Show caution only when lists published; show both when no lists
**Implementation**:
```typescript
// In summary-of-publications/index.njk
{% if cautionMessage and publications.length > 0 %}
  <p class="govuk-body">{{ cautionMessage }}</p>
{% endif %}

{% if publications.length === 0 %}
  {% if cautionMessage %}
    <p class="govuk-body">{{ cautionMessage }}</p>
  {% endif %}
  {% if noListMessage %}
    <p class="govuk-body">{{ noListMessage }}</p>
  {% endif %}
{% endif %}
```
**Verification**:
- With publications: Only caution visible
- Without publications: Both caution and no-list visible
- Test with different message combinations

## Open Questions

### CLARIFICATIONS NEEDED

1. **Scope of locations**: Should the metadata management be available for ALL locations, or specifically only RCJ and Rolls Building? The ticket mentions "RCJ and Rolls Building" but the implementation allows any location to have metadata.

2. **Default messages**: Should RCJ and Rolls Building have the default caution/no-list messages pre-populated in the database as part of migration, or should admins manually enter them after deployment?

3. **Message formatting**: Should the textareas support any formatting (bold, links, etc.) or plain text only? Current implementation assumes plain text with Nunjucks auto-escaping.

4. **FaCT link**: The ticket mentions "under the FaCT link" but I don't see a FaCT link in the current summary-of-publications template. Should we add this link, or is the positioning relative to publications list sufficient?

5. **Character limits**: Should there be any character limits on the message fields, or should they be unlimited TEXT fields?

6. **Audit logging**: Should create/update/delete operations on location metadata be logged in the audit log system mentioned in the system admin dashboard?

7. **Notification on change**: When metadata is updated, should any users subscribed to that location receive a notification, or is this purely informational content?

8. **Historical tracking**: Should we keep a history of metadata changes (audit trail), or is the current version sufficient?

9. **Permissions**: Are SYSTEM_ADMIN the only users who should manage metadata, or should CTSC/Local admins also have access?

10. **Message display without publications**: If a location has NO publications AND no metadata configured, should we show the default "no publications" message, or leave it blank?
