# VIBE-247: Authenticate Publications Based on Sensitivity Level - Technical Plan

## Technical Approach

This ticket implements role-based and provenance-based authorisation for publications (artefacts) based on their sensitivity level. The system already has the foundational pieces: sensitivity levels on artefacts, user provenance tracking, and role-based middleware. The implementation extends the existing authorisation middleware to handle publication-specific access rules.

The approach uses a functional authorisation service that evaluates whether a user can access a publication based on: (1) their authentication status and role, (2) the publication's sensitivity level, and (3) provenance matching for classified lists. Access control is enforced through middleware that filters publications in list views and blocks unauthorized direct access. Local and CTSC admins receive special handling - they can view metadata and delete Private/Classified publications but cannot access the actual list data.

A key architectural decision is to keep authorisation logic in a separate service module that can be tested independently and reused across page controllers, API endpoints, and admin functions. The existing artefact model already contains the required fields (sensitivity, provenance), but we need to add list type provenance lookups to validate classified access.

## Implementation Details

### Key Files/Modules to Create

- `libs/publication/src/authorisation/service.ts` - Core authorisation logic
  - `canAccessPublication(user, artefact, listType)` - Main authorisation function
  - `canAccessPublicationData(user, artefact, listType)` - Check if user can see actual list data
  - `canAccessPublicationMetadata(user, artefact)` - Check if user can see metadata only
  - `filterAccessiblePublications(user, artefacts, listTypes)` - Filter list of publications

- `libs/publication/src/authorisation/middleware.ts` - Express middleware
  - `requirePublicationAccess()` - Middleware to protect individual publication routes
  - `requirePublicationDataAccess()` - Middleware to ensure user can view actual data (not just metadata)

- `libs/publication/src/authorisation/service.test.ts` - Comprehensive unit tests for authorisation logic

### Files to Modify

- `libs/publication/src/index.ts` - Export new authorisation functions
- `libs/public-pages/src/pages/summary-of-publications/index.ts` - Filter publications by user access
- `libs/public-pages/src/pages/publication/[id].ts` - Add authorisation check
- `libs/list-types/civil-and-family-daily-cause-list/src/pages/index.ts` - Add authorisation check (and similar for other list type pages)
- `libs/admin-pages/src/pages/remove-list-search-results/index.ts` - Show all publications to admins but indicate access restrictions
- `libs/admin-pages/src/pages/remove-list-confirmation/index.ts` - Allow admins to delete regardless of sensitivity

### Database Schema Changes

**No schema changes required.** The existing schema already has:
- `artefact.sensitivity` - Publication sensitivity level
- `artefact.provenance` - Publication source system
- `artefact.list_type_id` - Links to list type (which has provenance)
- `user.user_provenance` - User authentication source
- `user.role` - User role

The list type provenance is already available through `mockListTypes` and will be used to validate classified access.

### API Endpoints

No new API endpoints needed. Authorization will be added to existing endpoints:
- Page routes that display publications (GET handlers)
- Admin routes for publication management

## Error Handling & Edge Cases

- **Unauthenticated users accessing Private/Classified** - Redirect to login with return URL
- **Authenticated user without proper role** - Show 403 or redirect to appropriate dashboard
- **Verified user accessing Classified without matching provenance** - Show 403 error page
- **List type not found** - Treat as inaccessible (fail closed)
- **User provenance doesn't match any list type provenance** - Block access to classified lists
- **Local/CTSC admin attempting to view list data** - Show metadata only page or warning message
- **System admin** - Full access to all publications regardless of sensitivity
- **Public users** - Only see PUBLIC sensitivity publications
- **Missing sensitivity field on artefact** - Treat as CLASSIFIED (most restrictive, fail closed)
- **Malformed user session** - Redirect to login

## Acceptance Criteria Mapping

| AC | Implementation |
|---|---|
| AC1: Sensitivity level during upload | Already exists - artefact model has sensitivity field |
| AC2: Public accessible to all | `canAccessPublication` returns true for PUBLIC for all users |
| AC3: Private accessible to verified | `canAccessPublication` checks user.role is not undefined (authenticated/verified) |
| AC4: Classified accessible with provenance match | `canAccessPublication` checks userProvenance matches listType.provenance |
| AC5: Validation using user provenance | Authorization service uses UserProfile.provenance from session |
| AC6: Parent-child relationship hierarchy | Implemented through USER_ROLES constants and role checking logic |
| AC7: System admin full access | `canAccessPublication` returns true for SYSTEM_ADMIN role |
| AC8: Verified user classified check | `canAccessPublication` checks provenance match for CLASSIFIED |
| AC9: Local/CTSC admin metadata only | `canAccessPublicationData` returns false, separate metadata view implemented |
| AC10: Public users only PUBLIC | `canAccessPublication` returns false for unauthenticated on PRIVATE/CLASSIFIED |

## Open Questions

1. Should we display a message to users explaining why they cannot see certain publications, or silently filter them from lists?
   - **Recommendation**: Silent filtering in list views, explicit 403 page when directly accessing

2. For Local/CTSC admins viewing metadata, what specific fields should they see? (e.g., list type, content date, display dates, but not case details)
   - **Recommendation**: Show all artefact metadata (location, dates, sensitivity) but not the JSON payload

3. Should B2C verified users have automatic access to all provenances for classified lists, or should we track their specific provenance?
   - **Recommendation**: Based on permissions matrix, B2C users should have access to all classified lists (provenance check only applies to differentiate between B2C, CFT_IDAM, CRIME_IDAM users)

4. How should we handle publications where the list type provenance doesn't match any known user provenance values?
   - **Recommendation**: Fail closed - treat as inaccessible unless user is SYSTEM_ADMIN
