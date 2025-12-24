# VIBE-215: Ready for Implementation

## Status: ✅ PLANNING COMPLETE

All clarifications have been resolved and the specification has been finalized.

## Key Decisions Summary

### 1. File Extension Strategy ✅
**All flat files are PDFs** - The simplest solution!
- artefactId stored as UUID only in database
- Files stored as `{uuid}.pdf` on filesystem
- Use `isFlatFile` boolean field to determine file type
- Append `.pdf` automatically when retrieving files
- No database schema changes needed
- No upload flow changes needed

### 2. URL Pattern
`/hearing-lists/:locationId/:artefactId`
- Matches ticket specification
- Validates locationId for security
- Shows court-specific URLs to users

### 3. HTML Wrapper Page
Full GOV.UK template page with embedded PDF viewer
- Controls browser tab title: "[Court Name] – [List Name]"
- Embeds PDF using `<object>` tag
- Provides download link
- Shows court name and list name in heading

### 4. Two Routes Required
1. **Viewer Page**: `/hearing-lists/:locationId/:artefactId` (HTML)
2. **Download API**: `/api/flat-file/:artefactId/download` (PDF binary)

## Implementation Simplifications

Compared to the original complex specification, the "all PDFs" clarification simplified:

1. **Removed file extension parsing** - No need for `getFileExtension()` or `isPdfFile()`
2. **Simplified MIME type logic** - Always `application/pdf`
3. **Removed conditional template logic** - Always show PDF embed viewer
4. **Reduced error states** - No "invalid file format" error
5. **Simplified file storage service** - Direct `.pdf` append

## File Structure

```
libs/public-pages/src/
├── pages/
│   └── hearing-lists/
│       └── view/
│           ├── [locationId]/
│           │   └── [artefactId].ts        # HTML wrapper page handler
│           ├── [locationId]/[artefactId].njk  # Template with embedded PDF
│           ├── en.ts                       # English translations
│           └── cy.ts                       # Welsh translations
├── routes/
│   └── flat-file/
│       └── [artefactId]/
│           └── download.ts                 # Raw PDF download API
├── flat-file/
│   ├── flat-file-service.ts               # Validation & metadata retrieval
│   └── flat-file-service.test.ts
└── file-storage/
    ├── file-retrieval.ts                  # File system operations
    └── file-retrieval.test.ts
```

## Core Implementation Functions

### File Retrieval
```typescript
// Always appends .pdf to artefactId
getFileBuffer(artefactId: string): Promise<Buffer | null>
getFileName(artefactId: string): string  // Returns "{uuid}.pdf"
getContentType(): string  // Always returns "application/pdf"
```

### Business Logic
```typescript
// Validates locationId, display dates, fetches metadata
getFlatFileForDisplay(artefactId: string, locationId: string)

// Downloads file with validation
getFileForDownload(artefactId: string)
```

## Security Validations

1. ✅ LocationId must match artefact.locationId
2. ✅ Display date range validation (displayFrom/displayTo)
3. ✅ isFlatFile must be true
4. ✅ Path traversal prevention
5. ✅ File existence validation

## Error Handling

| Error | HTTP Status | Message |
|-------|------------|---------|
| Invalid params | 400 | "Invalid request" |
| Artefact not found | 404 | "Hearing list not available or expired" |
| Location mismatch | 404 | "Hearing list not available or expired" |
| Not a flat file | 400 | "Not available as a file" |
| Date expired | 410 | "Hearing list not available or expired" |
| File missing | 404 | "Could not load file" |

## Deployment Requirements

### Helm Chart Changes Required
```yaml
# apps/web/helm/values.yaml
nodejs:
  replicas: 1              # Single pod (ephemeral storage limitation)
  autoscaling:
    enabled: false         # Disable until Azure Blob Storage implemented
```

### Follow-up Ticket Needed
Create ticket for Azure Blob Storage migration before production deployment
- Provision storage account and container
- Implement blob storage adapter
- Enable horizontal scaling
- Plan file migration

## Test Coverage Required

### Unit Tests (~15 tests)
- File retrieval functions
- Service validation logic
- Route handler error cases
- Welsh translation completeness

### E2E Tests (~25 tests)
- PDF embedding in browser
- Download button functionality
- Error page rendering
- LocationId validation (security)
- Welsh language support
- Accessibility (WCAG 2.2 AA)
- Browser compatibility (Chrome, Firefox, Safari, Edge)
- Mobile browser support

## Complexity Assessment

- **Estimated LOC**: ~600 lines of code
- **New Files**: 7 TypeScript files + 1 Nunjucks template
- **Development Time**: 4-5 days
- **Test Coverage Target**: 80-90%

## Documentation Created

All planning documents are in `/workspaces/cath-service/docs/tickets/VIBE-215/`:

1. ✅ **ticket.md** - Full JIRA ticket content
2. ✅ **specification.md** - Technical implementation spec (UPDATED for all-PDFs)
3. ✅ **tasks.md** - Task breakdown by agent role
4. ✅ **clarifications-resolved.md** - All 8 decisions documented
5. ✅ **implementation-changes.md** - Architecture change analysis
6. ✅ **critical-finding.md** - File extension issue (RESOLVED)
7. ✅ **READY-FOR-IMPLEMENTATION.md** - This file

## Git Branch

`feature/VIBE-215-view-publication-flat-files`

## Next Step

Run the implementation command:
```bash
/expressjs-monorepo:wf-implement VIBE-215
```

The specification is complete, all clarifications resolved, and the implementation approach is finalized.
