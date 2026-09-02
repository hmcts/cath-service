# Plan: #797 — Store uploaded file name in `source_artefact_id`, remove `file_extension`

## 1. Technical Approach

This is a data-model and backend refactor with no new UI pages. The change replaces the `file_extension` column on the `artefact` table with a `source_artefact_id` column that stores the original uploaded file name. Every place that previously read or wrote `fileExtension` must instead read or write `sourceArtefactId`.

The extension is always derivable from the stored name via `path.extname()`, so no information is lost. The migration backfills existing rows so previously-uploaded files remain resolvable and downloadable.

Key goals:
- Blob resolution (`<artefactId><ext>`) continues to work — the extension is derived from `source_artefact_id`.
- Downloads use `source_artefact_id` as the `Content-Disposition` file name instead of `<artefactId><ext>`.
- The `/publication` API endpoint (JSON ingestion) stores `upload.json` as the source artefact ID.
- Non-strategic Excel uploads that convert to JSON store the final JSON name (`<artefactId>.json`) as the source artefact ID so blob resolution stays correct.
- Test-support seeding is updated to set `source_artefact_id`.

## 2. Implementation Details

### 2.1 Files to change

| File | Change |
|------|--------|
| `libs/postgres-prisma/prisma/schema/base.prisma` | Replace `fileExtension` field with `sourceArtefactId` |
| `apps/postgres/prisma/migrations/<timestamp>_replace_file_extension_with_source_artefact_id/migration.sql` | New migration (add column, backfill, drop column) |
| `libs/publication/src/repository/queries.ts` | Replace `updateArtefactFileExtension` with `updateSourceArtefactId`; update `deleteArtefacts` to use `sourceArtefactId` |
| `libs/publication/src/repository/model.ts` | No change needed — `Artefact` interface does not expose the column directly |
| `libs/publication/src/file-storage/file-retrieval.ts` | Replace `getFileExtension` (reads `fileExtension`) with a version that reads `sourceArtefactId` and derives extension; replace `getFileName` to return `sourceArtefactId` directly |
| `libs/publication/src/index.ts` | Replace export of `updateArtefactFileExtension` with `updateSourceArtefactId` |
| `libs/public-pages/src/flat-file/flat-file-service.ts` | Adapt to new `getSourceArtefactId` helper; update `getFileForDownload` to set `fileName` from source artefact ID |
| `apps/web/src/pages/(admin)/manual-upload-summary/index.ts` | Replace `updateArtefactFileExtension(artefactId, fileExtension)` with `updateSourceArtefactId(artefactId, uploadData.fileName)` |
| `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts` | Same replacement; for the Excel→JSON conversion path use the converted blob name `${artefactId}.json` |
| `libs/api/src/blob-ingestion/repository/service.ts` | Replace `updateArtefactFileExtension(artefactId, fileExtension)` with `updateSourceArtefactId(artefactId, "upload.json")` |
| `libs/test-support/src/routes/test-support/flat-files.ts` | POST handler must accept an optional `sourceArtefactId` body field and call the update query so seeded artefacts have a valid `source_artefact_id` |

### 2.2 Schema change

**`libs/postgres-prisma/prisma/schema/base.prisma`**

Remove:
```prisma
fileExtension     String?           @map("file_extension") @db.VarChar(10)
```

Add:
```prisma
sourceArtefactId  String?           @map("source_artefact_id")
```

The field is nullable to match the migration strategy (backfill happens in SQL, new rows always have it set).

### 2.3 Migration SQL

New file: `apps/postgres/prisma/migrations/<timestamp>_replace_file_extension_with_source_artefact_id/migration.sql`

```sql
-- Add the new column
ALTER TABLE "artefact" ADD COLUMN "source_artefact_id" TEXT;

-- Backfill existing rows using artefact_id + file_extension
-- Rows without a file_extension fall back to .pdf (mirrors current default in code)
UPDATE "artefact"
SET "source_artefact_id" = "artefact_id" || COALESCE("file_extension", '.pdf')
WHERE "source_artefact_id" IS NULL;

-- Remove the now-redundant column
ALTER TABLE "artefact" DROP COLUMN "file_extension";
```

### 2.4 `libs/publication/src/repository/queries.ts`

Replace `updateArtefactFileExtension`:
```typescript
export async function updateSourceArtefactId(artefactId: string, sourceArtefactId: string): Promise<void> {
  await prisma.artefact.update({
    where: { artefactId },
    data: { sourceArtefactId }
  });
}
```

Update `deleteArtefacts` to select `sourceArtefactId` instead of `fileExtension` and derive the blob name from it:
```typescript
const artefacts = await prisma.artefact.findMany({
  where: { artefactId: { in: artefactIds } },
  select: { artefactId: true, sourceArtefactId: true }
});
// ...
for (const artefact of artefacts) {
  const extension = artefact.sourceArtefactId
    ? path.extname(artefact.sourceArtefactId)
    : ".pdf";
  deleteBlob(`${artefact.artefactId}${extension}`, CONTAINER.ARTEFACT)...
}
```

### 2.5 `libs/publication/src/file-storage/file-retrieval.ts`

Replace `getFileExtension` (which queried `fileExtension`) with `getSourceArtefactId` that queries `sourceArtefactId`, and derive the extension from it:

```typescript
export async function getSourceArtefactId(artefactId: string): Promise<string> {
  const artefact = await prisma.artefact.findUnique({
    where: { artefactId },
    select: { sourceArtefactId: true }
  });
  // Backfilled rows have "<uuid><ext>"; new rows have the original file name
  return artefact?.sourceArtefactId ?? `${artefactId}.pdf`;
}

export async function getFileBuffer(artefactId: string): Promise<Buffer | null> {
  const sourceArtefactId = await getSourceArtefactId(artefactId);
  const extension = path.extname(sourceArtefactId) || ".pdf";
  return downloadBlob(`${artefactId}${extension}`, CONTAINER.ARTEFACT);
}

export function getFileName(sourceArtefactId: string): string {
  return sourceArtefactId;
}
```

The existing `getFileExtension` export is retained as a thin wrapper that derives the extension from `sourceArtefactId` to avoid breaking any callers outside the files listed above:
```typescript
export async function getFileExtension(artefactId: string): Promise<string> {
  const sourceArtefactId = await getSourceArtefactId(artefactId);
  return path.extname(sourceArtefactId) || ".pdf";
}
```

Actually, a cleaner approach: update `getFileExtension` in place (it is called from `flat-file-service.ts`) to derive from `sourceArtefactId`, so no signature change is needed by callers. This minimises surface area.

### 2.6 Upload flows

**`manual-upload-summary/index.ts`** — POST handler currently:
```typescript
const fileExtension = await saveUploadedFile(artefactId, uploadData.fileName, uploadData.file);
await updateArtefactFileExtension(artefactId, fileExtension);
```

Replace with:
```typescript
await saveUploadedFile(artefactId, uploadData.fileName, uploadData.file);
await updateSourceArtefactId(artefactId, uploadData.fileName);
```

**`non-strategic-upload-summary/index.ts`** — POST handler has two paths:

- Normal flat file: same as above — store `uploadData.fileName`.
- Excel→JSON conversion: after the converted JSON blob is saved, store `${artefactId}.json` as the source artefact ID (the JSON blob is what gets served, so the extension must resolve to `.json`).

**`libs/api/src/blob-ingestion/repository/service.ts`**:
```typescript
await saveUploadedFile(artefactId, "upload.json", jsonBuffer);
await updateSourceArtefactId(artefactId, "upload.json");
```

### 2.7 `libs/public-pages/src/flat-file/flat-file-service.ts`

`getFlatFileForDisplay` currently returns `fileExtension`. It should return `sourceArtefactId` (the caller in `hearing-lists/[locationId]/[artefactId]/index.ts` uses it to check if it is a PDF and to form the download URL). Update the return shape and the caller.

`getFileForDownload` calls `getFileName(artefact.artefactId, fileExtension)` — replace with the new `getFileName(sourceArtefactId)` signature.

### 2.8 `libs/publication/src/index.ts`

Remove export of `updateArtefactFileExtension`, add export of `updateSourceArtefactId`. Keep `getFileExtension` exported (used externally) — it now derives from `sourceArtefactId` internally.

### 2.9 `libs/test-support/src/routes/test-support/flat-files.ts`

The POST handler seeds a blob but does not touch the artefact row. It should accept a `sourceArtefactId` body field and call `updateSourceArtefactId` so E2E tests can rely on correct download names.

## 3. Error Handling & Edge Cases

### Backfilled legacy rows
Pre-migration rows have `source_artefact_id` set to `<uuid><extension>` (e.g. `a1b2c3d4-.pdf`). The download name for these will be the UUID-based name — this is intentional and acceptable per the spec.

### Null `sourceArtefactId`
The column is nullable. Any code reading it must apply a sensible default (`${artefactId}.pdf`) rather than crash. The `getSourceArtefactId` helper handles this.

### Extension derivation
`path.extname("civil-daily-cause-list.pdf")` → `".pdf"` — this is reliable for any well-formed file name. A file name with no extension returns `""`, in which case the code falls back to `.pdf`.

### Non-strategic Excel→JSON conversion
The original Excel file name is stored first (to mirror what the publisher uploaded), but is then overwritten with `${artefactId}.json` after conversion. This is the authoritative blob. The original Excel name is not preserved after conversion — this is consistent with the current behaviour and avoids serving an Excel blob that no longer exists.

### Concurrent updates (supersede path)
`createArtefact` may return an existing `artefactId` when the same location/listType/contentDate/language already exists (supersede). The `updateSourceArtefactId` call that follows uses the returned `artefactId`, so the new file name overwrites the old one — correct behaviour.

## 4. Acceptance Criteria Mapping

| Acceptance Criterion | Implementation |
|---|---|
| Manual upload stores `source_artefact_id = <original file name>` | `manual-upload-summary` POST calls `updateSourceArtefactId(artefactId, uploadData.fileName)` |
| Download returns the original file name | `getFileForDownload` sets `fileName` to `sourceArtefactId` (the original name); `Content-Disposition` uses this value |
| `/publication` API stores a source name | `blob-ingestion/repository/service.ts` calls `updateSourceArtefactId(artefactId, "upload.json")` |
| `file_extension` column removed | Migration drops the column; Prisma schema removes the field; all code references replaced |
| Existing artefacts still work after migration | Migration backfills `source_artefact_id = artefact_id || COALESCE(file_extension, '.pdf')` before dropping the column |

## 5. Open Questions / Clarifications Needed

1. **Non-strategic Excel display name.** After conversion the source artefact ID is set to `${artefactId}.json`, not the original `.xlsx` name. Should the display name shown to users be the original Excel file name, or is it acceptable that it resolves to the JSON blob name? The spec is silent on this.

2. **`/publication` API file name.** The current plan stores `upload.json` as the source artefact ID for all JSON API ingestions. If different callers want to pass a meaningful source name (e.g. a specific JSON file name), the `BlobIngestionRequest` model would need a new optional `source_file_name` field. The spec says `upload.json` is acceptable — confirm this is the desired end state.

3. **`getFileExtension` export retained?** Several callers (e.g. `flat-file-service.ts`) currently import `getFileExtension`. The plan retains this export so its signature is unchanged, but its internal implementation now reads `sourceArtefactId`. Confirm whether the export should be removed in favour of `getSourceArtefactId` as a breaking change for any external consumers.

4. **Test-support blob container.** The current `flat-files.ts` POST uploads to `CONTAINER.ARTEFACT` but the artefact row it relates to lives in the database. The plan adds a `sourceArtefactId` body param and calls `updateSourceArtefactId`, which requires the artefact row to already exist. Confirm that E2E test setup always creates the artefact row before calling the flat-files seed endpoint.
