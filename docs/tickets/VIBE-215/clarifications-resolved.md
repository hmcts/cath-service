# VIBE-215: Clarifications Resolved

## Decision Summary

The following decisions have been made regarding implementation approach:

### 1. File Extension Storage ✓
**Decision**: All flat files are PDFs - use `isFlatFile` field to determine extension

**Impact**:
- artefactId stored as UUID only: `c1baacc3-8280-43ae-8551-24080c0654f9`
- Files stored on filesystem as `c1baacc3-8280-43ae-8551-24080c0654f9.pdf`
- When `isFlatFile === true`, automatically append `.pdf` extension
- No changes to upload flow required
- No database schema changes required
- Simplified implementation (no extension parsing needed)

### 2. URL Pattern ⚠️ SIGNIFICANT CHANGE
**Decision**: Option (b) - Implement `/hearing-lists/{court-id}/{list-id}`

**Impact**:
- URL requires mapping from court-id and list-id to artefactId
- Need to query: locationId (court-id), contentDate (list date), listTypeId
- More complex routing than simple artefactId lookup
- Requires additional database query to resolve route parameters

**Implementation Notes**:
- Route: `/hearing-lists/:locationId/:artefactId`
- locationId serves as court-id
- artefactId serves as list-id (contains date and type information)
- Validate locationId matches artefact.locationId for security

### 3. Browser Tab Title ⚠️ MAJOR ARCHITECTURAL CHANGE
**Decision**: Option (b) - Create HTML wrapper page with embedded viewer

**Impact**:
- Cannot serve files directly - must create wrapper HTML page
- Need to embed PDF viewer (using `<object>` or `<embed>` tags)
- Need separate download endpoint for non-PDF files
- Can control page title, metadata display, and navigation
- More complex implementation than direct file serving

**Implementation Notes**:
- Wrapper page at `/hearing-lists/{court-id}/{list-id}` renders HTML
- Embedded PDF viewer or download link based on file type
- Page title set in HTML: `<title>[Court Name] – [List Name]</title>`
- Separate API endpoint for raw file download: `/api/flat-file/{artefactId}/download`

### 4. Language Toggle ✓
**Decision**: Option (a) - Don't implement toggle - files are language-specific

**Impact**:
- No language toggle implementation needed
- Files are inherently English or Welsh based on `language` field
- Error messages use i18n middleware (existing functionality)

### 5. Azure Blob Storage Scope ✓
**Decision**: Option (a) - Separate ticket for blob migration

**Impact**:
- Keep filesystem storage for this ticket
- Document limitation in deployment notes
- Create follow-up ticket for production storage solution

### 6. Metadata Display ✓
**Decision**: Option (a) - Not implemented initially

**Impact**:
- Wrapper page shows court name and list name (in title bar)
- No additional metadata display in page body
- Can be added in future enhancement if needed

### 7. File Size Limits ✓
**Decision**: No artificial limit

**Impact**:
- Let browser handle large files
- User can download if browser struggles with inline display
- Monitor performance in production

### 8. File Upload Format ✓
**Decision**: Verify manual-upload stores as `{uuid}.{ext}` with extension in artefactId

**Impact**:
- Need to verify existing manual-upload implementation
- Ensure consistency across upload flows
- Document expected format

## Revised Implementation Approach

### Major Changes from Original Specification

1. **URL Routing**:
   - Original: `/flat-file/[artefactId]`
   - Revised: `/hearing-lists/:locationId/:artefactId`
   - Requires validation that locationId matches artefact

2. **File Serving**:
   - Original: Direct file serving with Content-Disposition headers
   - Revised: HTML wrapper page with embedded viewer
   - Requires separate download API endpoint

3. **Page Structure**:
   - Original: Simple error page or direct file
   - Revised: Full page with GOV.UK template, embedded viewer, metadata

### New Components Required

1. **HTML Wrapper Page**:
   - Route: `/hearing-lists/:locationId/:artefactId`
   - Template: `hearing-lists/view.njk`
   - Controller: `hearing-lists/view.ts`
   - Shows court name, list name, publication date
   - Embeds PDF viewer or provides download link

2. **Download API Endpoint**:
   - Route: `/api/flat-file/:artefactId/download`
   - Serves raw file with appropriate headers
   - Used by embedded viewer and download buttons

3. **PDF Embed Logic**:
   - Use `<object>` tag with fallback to download link
   - Detect PDF support in browser
   - Provide download button for all file types

### Risks and Considerations

1. **PDF Embed Browser Compatibility**:
   - Safari, Chrome, Firefox have different PDF viewer behaviors
   - Mobile browsers may not support embedded PDF viewing
   - Need graceful fallback to download

2. **URL Complexity**:
   - locationId validation adds security concern
   - More database queries per request
   - Need clear error messages for invalid court-id/list-id combinations

3. **Increased Scope**:
   - HTML wrapper significantly increases implementation complexity
   - More template work, more JavaScript potentially needed
   - More E2E test scenarios

### Updated Acceptance Criteria Mapping

| Original AC | Implementation Strategy |
|-------------|------------------------|
| AC4: Open in new tab | `target="_blank"` on link in summary page |
| AC5: Display all cases | Embed full file in viewer or provide download |
| AC6: Preserve format | Use native browser PDF viewer or download |
| AC7: Scroll/zoom/download | Browser viewer controls + download button |
| AC8: Court/list in tab title | HTML wrapper with `<title>` tag |
| AC9: Error messages | Error page for validation failures |
| AC10: GOV.UK compliance | Use GOV.UK template for wrapper page |

## Next Steps

1. Update specification.md with revised implementation approach
2. Update tasks.md with new components and complexity
3. Verify manual-upload file extension handling
4. Begin implementation with `/expressjs-monorepo:wf-implement VIBE-215`
