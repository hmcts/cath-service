# VIBE-215: Specification Updates Based on Clarification Decisions

## Summary

The clarification decisions have resulted in significant architectural changes from the original recommendation. The implementation is now more complex but better aligned with the ticket requirements.

## Major Architectural Changes

### 1. URL Routing Pattern
**Original Recommendation**: `/flat-file/[artefactId]`
**New Decision**: `/hearing-lists/:locationId/:artefactId`

**Impact**:
- More complex routing logic required
- Need to validate locationId matches artefact.locationId (security)
- URL structure matches ticket specification
- Better user experience (descriptive URLs)

### 2. File Serving Strategy
**Original Recommendation**: Direct file serving with Content-Disposition headers
**New Decision**: HTML wrapper page with embedded viewer

**Impact**:
- Significant increase in implementation complexity
- Two routes required instead of one:
  - HTML wrapper page: `/hearing-lists/:locationId/:artefactId`
  - Download API: `/api/flat-file/:artefactId/download`
- Full GOV.UK template page required
- PDF embedding using `<object>` tag
- Can control browser tab title (meets AC8)
- Better user experience for metadata display

## New Components Required

### Pages
1. **HTML Wrapper Page**: `libs/public-pages/src/pages/hearing-lists/view/[locationId]/[artefactId].ts`
   - Validates locationId and artefactId
   - Fetches artefact metadata
   - Renders template with embedded viewer or download link

2. **Wrapper Template**: `libs/public-pages/src/pages/hearing-lists/view/[locationId]/[artefactId].njk`
   - GOV.UK base template
   - Displays court name and list name in heading
   - Embeds PDF viewer for PDF files
   - Provides download button for all files
   - Error page mode for validation failures

### API Routes
3. **Download Endpoint**: `libs/public-pages/src/routes/flat-file/[artefactId]/download.ts`
   - Serves raw file content
   - Used by embedded PDF viewer
   - Used by download buttons
   - Returns JSON errors for API consumers

### Services
4. **Flat File Service**: Enhanced with two functions
   - `getFlatFileForDisplay()` - returns metadata for viewer page
   - `getFileForDownload()` - returns file buffer for download

5. **File Retrieval Service**: Enhanced with helper functions
   - `getFileExtension()` - extract extension from artefactId
   - `isPdfFile()` - determine if file is PDF

### Translations
6. **English Translations**: `libs/public-pages/src/pages/hearing-lists/view/en.ts`
   - Error messages
   - Viewer page content (download links, PDF fallback messages)

7. **Welsh Translations**: `libs/public-pages/src/pages/hearing-lists/view/cy.ts`
   - Welsh versions of all English content

## Database Changes

**No database schema changes required**

- Uses existing `artefact` table
- Requires `include: { location: true, listType: true }` in queries to fetch court name and list type name
- artefactId already includes file extension (e.g., `uuid.pdf`)

## Security Enhancements

### New Security Validations
1. **Location ID Matching**: Verify locationId in URL matches artefact.locationId in database
2. **Prevents Unauthorized Access**: Users cannot access files by guessing URLs with different court IDs

### Existing Security Measures (Maintained)
- Path traversal prevention
- File type validation
- Display date validation
- Input validation

## File Storage

**No changes to storage approach**
- Continue using filesystem storage at `storage/temp/uploads/`
- Files stored as `{uuid}.{extension}` (e.g., `c1baacc3-8280-43ae-8551-24080c0654f9.pdf`)
- Azure Blob Storage migration is separate ticket

## Testing Impact

### Additional E2E Tests Required
1. Test HTML wrapper page renders correctly
2. Test embedded PDF viewer loads file
3. Test download button works for non-PDF files
4. Test PDF fallback message for browsers without PDF support
5. Test page title displays court name and list name
6. Test locationId validation (URL tampering)
7. Test download API endpoint directly
8. Test browser compatibility (Chrome, Firefox, Safari, Edge)

### Additional Unit Tests Required
1. Test `getFlatFileForDisplay()` with locationId validation
2. Test `getFileForDownload()` function
3. Test `isPdfFile()` helper
4. Test `getFileExtension()` helper
5. Test HTML wrapper page handler with location mismatch error
6. Test download API endpoint handler

## Implementation Complexity Estimate

### Original Approach (Simple File Serving)
- **Complexity**: Low
- **Files**: 4 new files
- **Lines of Code**: ~300 LOC
- **Test Scenarios**: ~15 tests

### New Approach (HTML Wrapper with Embedded Viewer)
- **Complexity**: Medium-High
- **Files**: 7 new files + 1 template file
- **Lines of Code**: ~600 LOC
- **Test Scenarios**: ~25 tests

**Complexity Increase**: ~100% more code and tests

## Benefits of New Approach

1. **Meets AC8 Fully**: Browser tab shows "[Court Name] – [List Name]"
2. **Better User Experience**: Users see court name and list name on page
3. **Download Convenience**: Download button always visible
4. **PDF Fallback**: Graceful degradation for browsers without PDF support
5. **Consistent UI**: Uses GOV.UK template, matches rest of application
6. **Enhanced Security**: LocationId validation prevents unauthorized access

## Risks and Mitigation

### Risk 1: Browser PDF Viewer Compatibility
**Risk**: Different browsers render PDF differently, mobile browsers may not support embedded PDFs
**Mitigation**: Provide download fallback, test on all major browsers

### Risk 2: Implementation Complexity
**Risk**: More code means more potential for bugs
**Mitigation**: Comprehensive unit and E2E tests, code review

### Risk 3: URL Complexity
**Risk**: Two-parameter URLs are harder to construct and validate
**Mitigation**: Clear error messages, validation at service layer

### Risk 4: Performance
**Risk**: Additional database query to fetch location and listType names
**Mitigation**: Single query with `include`, results are cacheable

## Development Timeline Impact

**Original Estimate**: 2-3 days
**New Estimate**: 4-5 days

**Reason**: Additional HTML wrapper, template work, and increased test coverage

## Deployment Considerations

**No deployment changes required beyond original plan**:
- Helm chart updates for single-replica deployment (already documented)
- No new environment variables
- No database migrations
- Azure Blob Storage is separate ticket

## Recommendation

The increased complexity is justified by:
1. Meeting AC8 requirement for browser tab title
2. Better alignment with ticket specification
3. Improved user experience
4. Enhanced security with locationId validation

Proceed with HTML wrapper implementation as specified.
