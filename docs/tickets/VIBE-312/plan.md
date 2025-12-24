# VIBE-312: Delete Court Process - Technical Plan

## 1. Technical Approach

### High-Level Strategy
Implement a soft delete mechanism for court locations by adding a `deleted_at` timestamp field to the Location table. The implementation follows a 4-page journey within the existing system-admin-pages module:

1. System Admin Dashboard (existing - add navigation)
2. Find the Court to Remove (new - search page with autocomplete)
3. Are You Sure You Want to Delete This Court? (new - confirmation with validation)
4. Delete Successful (new - success confirmation)

### Architecture Decisions

**Soft Delete Pattern**: Add `deleted_at` timestamp to Location model rather than boolean flag for audit trail and potential restoration.

**Validation Order**: Check subscriptions first, then artefacts, as subscriptions are the primary concern and likely more common.

**Session Storage**: Use Express session to pass location data between pages to avoid redundant database queries and prevent URL tampering.

**Location Search**: Leverage existing `/locations` API endpoint with autocomplete for consistent UX.

**Database Filtering**: Update all location queries to exclude soft-deleted records using `WHERE deleted_at IS NULL`.

## 2. Implementation Details

### Database Schema Changes

**Location Table Migration**:
```prisma
model Location {
  locationId  Int       @id @map("location_id")
  name        String    @unique
  welshName   String    @unique @map("welsh_name")
  email       String?
  contactNo   String?   @map("contact_no")
  deletedAt   DateTime? @map("deleted_at")  // NEW FIELD

  locationRegions          LocationRegion[]
  locationSubJurisdictions LocationSubJurisdiction[]
  subscriptions            Subscription[]

  @@map("location")
}
```

### File Structure

All files within `libs/system-admin-pages`:

```
libs/system-admin-pages/
├── src/
│   ├── pages/
│   │   ├── system-admin-dashboard/
│   │   │   ├── index.ts (update - add navigation)
│   │   │   ├── index.njk (existing)
│   │   │   ├── en.ts (update - add tile)
│   │   │   └── cy.ts (update - add tile)
│   │   ├── delete-court/ (NEW)
│   │   │   ├── index.ts (controller)
│   │   │   ├── index.njk (template)
│   │   │   ├── en.ts (English content)
│   │   │   └── cy.ts (Welsh content)
│   │   ├── delete-court-confirm/ (NEW)
│   │   │   ├── index.ts (controller)
│   │   │   ├── index.njk (template)
│   │   │   ├── en.ts (English content)
│   │   │   └── cy.ts (Welsh content)
│   │   └── delete-court-success/ (NEW)
│   │       ├── index.ts (controller)
│   │       ├── index.njk (template)
│   │       ├── en.ts (English content)
│   │       └── cy.ts (Welsh content)
│   └── delete-court/ (NEW - business logic)
│       ├── service.ts (orchestration)
│       ├── queries.ts (database operations)
│       └── validation.ts (validation logic)
```

### Page Controllers

**Page 1: Find the Court to Remove** (`/delete-court`)
- GET: Render search form with autocomplete
- POST: Validate selection, store in session, redirect to confirmation
- Session data: `req.session.deleteCourt = { locationId, name, welshName }`

**Page 2: Confirmation** (`/delete-court-confirm`)
- GET: Fetch full location details from session, display in table with radio buttons
- POST: Validate radio selection, check subscriptions/artefacts, perform soft delete or show errors

**Page 3: Success** (`/delete-court-success`)
- GET: Display success banner, clear session data

### Business Logic (libs/system-admin-pages/src/delete-court/)

**queries.ts**:
```typescript
- getLocationWithDetails(locationId: number): Location with regions/jurisdictions
- hasActiveSubscriptions(locationId: number): boolean
- hasActiveArtefacts(locationId: string): boolean
- softDeleteLocation(locationId: number): void
```

**service.ts**:
```typescript
- validateLocationForDeletion(locationId: number): ValidationResult
- performLocationDeletion(locationId: number): Result
```

**validation.ts**:
```typescript
- validateLocationSelected(locationId: string | undefined): ErrorList
- validateRadioSelection(value: string | undefined): ErrorList
```

### Location Query Updates

Update these files to exclude soft-deleted locations:

1. `libs/location/src/repository/queries.ts`:
   - `getAllLocations()` - add `WHERE deleted_at IS NULL`
   - `getLocationById()` - add `WHERE deleted_at IS NULL`

2. `libs/location/src/repository/service.ts`:
   - `searchLocations()` - filter deleted locations

### API Changes

No new API endpoints required. The existing `/locations` endpoint will automatically exclude deleted locations after query updates.

## 3. Error Handling & Edge Cases

### Validation Scenarios

**Find Court Page**:
- No location selected → "Enter a court or tribunal name"
- Invalid location ID → "Court or tribunal not found"
- Location already deleted → "Court or tribunal not found"

**Confirmation Page**:
- No radio button selected → "Select yes or no to continue"
- Active subscriptions exist → "There are active subscriptions for the given location."
- Active artefacts exist → "There are active artefacts for the given location."
- Location ID missing from session → Redirect to search page

**Success Page**:
- Direct access without completing flow → Redirect to dashboard

### Error Recovery

- Database errors → Log error, display generic error message, preserve form data
- Session loss → Redirect to start of journey
- Concurrent deletion → Handle gracefully (idempotent soft delete)

### Edge Cases

1. **Location already soft-deleted**: Treat as not found in search
2. **User navigates back after deletion**: Show success page or redirect to dashboard
3. **Multiple tabs/concurrent requests**: Use database-level constraints
4. **Artefact with locationId as string vs Location.locationId as int**: Type conversion required

## 4. Acceptance Criteria Mapping

| Criterion | Implementation |
|-----------|----------------|
| Access Delete Court from dashboard | Update dashboard tiles with "Delete Court" link |
| Search and find court | Search page with autocomplete using existing `/locations` API |
| Display court details in table | Confirmation page with Location details (name, type, jurisdiction, region) |
| Radio buttons Yes/No | GovUK Radio component in confirmation page |
| Check active subscriptions | Query `subscription` table `WHERE location_id = ? AND EXISTS` |
| Check active artefacts | Query `artefact` table `WHERE location_id = ? AND display_to > NOW()` |
| Show appropriate errors | Validation in POST handler with GOV.UK error patterns |
| Soft delete location | Update `deleted_at = NOW() WHERE location_id = ?` |
| Success confirmation | Green banner on success page |
| Court no longer visible | Update all queries with `WHERE deleted_at IS NULL` |
| WCAG 2.2 AA compliance | Use GOV.UK components, proper ARIA labels, keyboard navigation |
| Welsh translations | Complete cy.ts files for all pages |

## 5. Testing Strategy

### Unit Tests
- `delete-court/validation.ts` - All validation scenarios
- `delete-court/queries.ts` - Database operations (mocked Prisma)
- `delete-court/service.ts` - Business logic flow

### Integration Tests
- Page controllers with session handling
- Database soft delete operations
- Query filtering of deleted locations

### E2E Tests (Playwright)
Create ONE comprehensive test covering the complete journey:
- Navigate from dashboard → search → confirm → success
- Test validation errors inline (empty search, no radio selection)
- Test Welsh translation inline (switch language mid-journey)
- Test accessibility inline (AxeBuilder checks)
- Test subscription/artefact blocking (with test data setup)

## 6. Security Considerations

- System Admin role required for all pages (existing `requireRole` middleware)
- No sensitive data in URLs (use session storage)
- CSRF protection on POST forms (existing middleware)
- Input validation on all user inputs
- Database parameterized queries (Prisma handles this)

## 7. Performance Considerations

- Single database query per page load
- Session storage for location data (avoid repeated queries)
- Indexed queries on `deleted_at`, `location_id`
- No N+1 query problems

## 8. Rollback Strategy

If issues arise:
1. Revert location query changes to show all locations
2. Disable "Delete Court" navigation link
3. Keep soft-deleted data intact (no data loss)
4. Database migration can add column without breaking existing functionality

---

## CLARIFICATIONS NEEDED

1. **Location Type Classification**: The ticket mentions displaying "Location Type" in the confirmation table, but the Location table doesn't have a `type` field. Should we:
   - Display "Court" or "Tribunal" based on jurisdiction?
   - Add a new `locationType` field to the schema?
   - Display a placeholder value?

2. **Artefact Active Definition**: What defines an "active" artefact?
   - Current assumption: `display_to > NOW()`
   - Should we also check `display_from <= NOW()`?
   - Are superseded artefacts considered active?

3. **Jurisdiction Display Logic**: When displaying jurisdiction in the confirmation table:
   - Should we show the parent Jurisdiction name?
   - Should we show all SubJurisdictions?
   - Should we show both?

4. **Artefact locationId Type Mismatch**:
   - Location.locationId is `Int`
   - Artefact.locationId is `String`
   - This appears to be a schema inconsistency. Should we:
     - Add a migration to change Artefact.locationId to Int?
     - Handle string-to-int conversion in queries?

5. **Restoration Process**: Should we implement an "undelete" feature for accidentally deleted courts, or is soft delete purely for audit purposes?
