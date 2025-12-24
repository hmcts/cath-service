# CRITICAL FINDING: File Extension Storage Mismatch

## Current Implementation Analysis

After reviewing the manual-upload code, I've discovered a **mismatch** between the clarification decision and the current implementation:

### Current State (`libs/admin-pages/src/pages/manual-upload-summary/index.ts`)

```typescript
// Line 93-94: Generate UUID without extension
const artefactId = await createArtefact({
  artefactId: randomUUID(),  // e.g., "12345678-1234-1234-1234-123456789012"
  // ... other fields
});

// Line 107: Save file with extension added
await saveUploadedFile(artefactId, uploadData.fileName, uploadData.file);
```

### File Storage Implementation (`libs/admin-pages/src/manual-upload/file-storage.ts`)

```typescript
export async function saveUploadedFile(artefactId: string, originalFileName: string, fileBuffer: Buffer) {
  const fileExtension = path.extname(originalFileName);  // e.g., ".pdf"
  const newFileName = `${artefactId}${fileExtension}`;   // e.g., "uuid.pdf"

  const filePath = path.join(TEMP_STORAGE_BASE, newFileName);
  await fs.writeFile(filePath, fileBuffer);
}
```

### Result

- **Database artefactId**: `12345678-1234-1234-1234-123456789012` (UUID only)
- **Filesystem filename**: `12345678-1234-1234-1234-123456789012.pdf` (UUID + extension)

## Impact on Clarification Decision #1

Our clarification decision #1 assumed:
> "Files stored as `{uuid}.{ext}` and artefactId in database includes extension"

**This is NOT how the current system works.**

## Resolution Options

### Option A: Modify Upload Flow (Recommended)
**Change the manual-upload to store extension in artefactId**

**Pros**:
- Matches clarification decision
- Simpler file retrieval (direct lookup by artefactId)
- No ambiguity about file type
- Single source of truth

**Cons**:
- Requires changes to manual-upload flow
- Potential data migration for existing records

**Changes Required**:
```typescript
// libs/admin-pages/src/pages/manual-upload-summary/index.ts
const fileExtension = path.extname(uploadData.fileName);
const artefactId = await createArtefact({
  artefactId: `${randomUUID()}${fileExtension}`,  // Include extension in UUID
  // ... other fields
});
```

### Option B: Adapt Retrieval Logic (Alternative)
**Keep upload flow as-is, modify retrieval to handle mismatch**

**Pros**:
- No changes to upload flow
- No data migration needed
- Works with existing data

**Cons**:
- More complex retrieval logic
- Need to scan filesystem or store extension separately
- Two-step process: lookup UUID, find file with extension

**Changes Required**:
```typescript
// Need to find file by UUID prefix
export async function getFileBuffer(artefactId: string): Promise<Buffer | null> {
  // List files matching UUID pattern
  const files = await fs.readdir(STORAGE_BASE);
  const matchingFile = files.find(file => file.startsWith(artefactId));

  if (!matchingFile) return null;

  const filePath = path.join(STORAGE_BASE, matchingFile);
  return await fs.readFile(filePath);
}
```

### Option C: Add fileExtension Column (Most Robust)
**Store extension in separate database column**

**Pros**:
- No ambiguity
- Explicit data model
- Easy to query by file type
- Clean separation of concerns

**Cons**:
- Requires database schema change
- Data migration required
- More fields to manage

**Changes Required**:
```prisma
model Artefact {
  artefactId        String   @id @default(uuid())
  fileExtension     String?  @map("file_extension")  // NEW FIELD
  // ... other fields
}
```

## Recommendation

**Choose Option A: Modify Upload Flow**

### Reasoning

1. **Simplicity**: Direct file lookup without scanning
2. **Consistency**: Database and filesystem naming match
3. **No New Schema**: Reuses existing artefactId field
4. **Performance**: O(1) lookup vs O(n) scan

### Implementation Plan

1. **Update manual-upload flow** (this can be part of VIBE-215 or separate ticket):
   ```typescript
   // libs/admin-pages/src/pages/manual-upload-summary/index.ts
   const fileExtension = path.extname(uploadData.fileName);
   const baseUuid = randomUUID();
   const artefactIdWithExtension = `${baseUuid}${fileExtension}`;

   const artefactId = await createArtefact({
     artefactId: artefactIdWithExtension,
     // ... other fields
   });
   ```

2. **Update VIBE-215 implementation** to expect artefactId with extension:
   ```typescript
   // libs/public-pages/src/file-storage/file-retrieval.ts
   export async function getFileBuffer(artefactId: string): Promise<Buffer | null> {
     // artefactId already includes extension, use directly
     const filePath = path.join(STORAGE_BASE, artefactId);
     // ... rest of implementation
   }
   ```

3. **Data migration** (if needed for existing test data):
   ```sql
   -- Find existing flat file records and append extensions based on filesystem
   -- This is environment-specific and may not be needed for dev
   ```

## Action Items

- [ ] **Decision Required**: Confirm Option A is acceptable
- [ ] **Scope Clarification**: Should manual-upload changes be part of VIBE-215 or separate ticket?
- [ ] **Data Migration**: Determine if existing test data needs migration
- [ ] **Update Specification**: Revise VIBE-215 spec to reflect chosen approach

## Risk Assessment

### If we proceed with current mismatch (Option B)
- **Risk**: File retrieval requires filesystem scan (performance impact)
- **Risk**: Race conditions if multiple files with same UUID prefix
- **Risk**: More complex error handling

### If we change upload flow (Option A)
- **Risk**: Breaking change for any existing integrations
- **Risk**: Need to update any code that generates or validates artefactIds
- **Risk**: UUID validation logic may reject UUIDs with extensions

### Mitigation
- Thorough testing of both upload and retrieval flows
- E2E tests covering file lifecycle
- Documentation of artefactId format expectations
