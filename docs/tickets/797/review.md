# Code Review: Issue #797 — Store uploaded file name in `source_artefact_id`, remove `file_extension`

## Summary

The implementation replaces the `file_extension` column on the `artefact` table with a `source_artefact_id` column that stores the original uploaded file name. The refactor touches the database schema, migration, two core libraries (`libs/publication`, `libs/public-pages`), three upload flows (manual upload, non-strategic upload, blob ingestion API), and the test-support seeding route. All 52 test packages pass. The broad approach is correct and the majority of the work is well executed.

There are no security vulnerabilities or WCAG failures. The issues below are a mix of correctness gaps, type safety concerns, and code quality points.

---

## CRITICAL Issues

### 1. E2E test asserts the old UUID-based filename — test will fail after migration for existing data, and does not verify the new behaviour at all

**File:** `/Users/junaid.iqbal/Documents/GitHub/cath-service/e2e-tests/tests/flat-file-viewing.spec.ts` line 248

```typescript
expect(contentDisposition).toContain(`${artefactId}.pdf`);
```

The whole point of this ticket is that the `Content-Disposition` filename should now be the *original uploaded name*, not `<artefactId>.pdf`. But the E2E test creates a file via `uploadTestFlatFileToWeb` **without passing `sourceArtefactId`** (the `UploadFlatFileInput` interface has no such field and the call site omits it). As a result:

- The test-support POST endpoint receives no `sourceArtefactId`, so `updateSourceArtefactId` is never called for the seeded artefact.
- The artefact row's `source_artefact_id` is NULL.
- `getSourceArtefactId` falls back to `${artefactId}.pdf`.
- The assertion passes — but only because the feature is effectively not exercised.

**Impact:** The acceptance criterion "Flat file downloaded with the original name" is not actually tested end-to-end. A regression that broke the feature would not be caught.

**Solution:** Either:
1. Add `sourceArtefactId` to `UploadFlatFileInput`, pass it from the E2E test helper, and update the assertion to match the supplied name (e.g. `civil-daily-cause-list.pdf`), or
2. At minimum, change the assertion to expect the *original* file name once the infrastructure is wired.

This needs fixing before deployment if the E2E suite is used as a regression gate.

---

### 2. `saveUploadedFile` in `libs/api/src/blob-ingestion/file-storage.ts` still returns `fileExtension` — the return value is now dead code

**File:** `/Users/junaid.iqbal/Documents/GitHub/cath-service/libs/api/src/blob-ingestion/file-storage.ts`

```typescript
export async function saveUploadedFile(...): Promise<string> {
  const fileExtension = path.extname(originalFileName);
  const blobName = `${artefactId}${fileExtension}`;
  await uploadBlob(blobName, fileBuffer);
  return fileExtension;   // <-- callers no longer use this
}
```

The identical function in `libs/admin-pages/src/manual-upload/file-storage.ts` also returns `fileExtension`. All three call sites (`manual-upload-summary`, `non-strategic-upload-summary`, `blob-ingestion/repository/service.ts`) now `await` the call without capturing the return value. The return type `Promise<string>` is therefore a lie and will confuse future maintainers.

**Impact:** No runtime bug, but the return value is misleading and the function signature violates the "no dead code" principle. Future callers could mistakenly rely on the returned value.

**Solution:** Change the return type to `Promise<void>` and remove the `return fileExtension` statement in both `file-storage.ts` files. The extension is always derivable from the `originalFileName` parameter by the caller, so nothing is lost.

---

## HIGH PRIORITY Issues

### 3. Migration is not idempotent — re-running it will fail

**File:** `/Users/junaid.iqbal/Documents/GitHub/cath-service/apps/postgres/prisma/migrations/20260707000000_replace_file_extension_with_source_artefact_id/migration.sql`

The migration uses bare `ALTER TABLE … ADD COLUMN` and `ALTER TABLE … DROP COLUMN` statements with no `IF NOT EXISTS` / `IF EXISTS` guards. The previous migration (`20260623000000_add_file_extension_to_artefact`) caused enough trouble in staging that it spawned two follow-up fix commits (`682dc7d8`, `6262312f`) to make it idempotent and force a re-run. The same pattern should be applied here proactively.

**Solution:**

```sql
ALTER TABLE "artefact" ADD COLUMN IF NOT EXISTS "source_artefact_id" TEXT;

UPDATE "artefact"
SET "source_artefact_id" = "artefact_id" || COALESCE("file_extension", '.pdf')
WHERE "source_artefact_id" IS NULL
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artefact' AND column_name = 'file_extension'
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'artefact' AND column_name = 'file_extension'
  ) THEN
    ALTER TABLE "artefact" DROP COLUMN "file_extension";
  END IF;
END $$;
```

### 4. `deleteArtefacts` deletes the database rows before the blob — leaves orphaned blobs if process crashes

**File:** `/Users/junaid.iqbal/Documents/GitHub/cath-service/libs/publication/src/repository/queries.ts` lines 175–194

```typescript
await prisma.artefact.deleteMany({ ... });  // rows gone

for (const artefact of artefacts) {
  deleteBlob(...).catch(...);               // fire-and-forget after delete
}
```

If the Node.js process is killed between the `deleteMany` and the blob deletions, the blobs are orphaned permanently. The artefact rows are gone so there is no way to discover which blobs to clean up later.

This is a pre-existing issue, but the ticket plan noted it as an area to review. The safest order is: delete blobs first, then delete the rows. Alternatively, a tombstone / soft-delete pattern would address it more robustly.

**Impact:** Orphaned blobs in Azure Blob Storage — cost and data hygiene concern.

**Solution (minimal):** Reverse the order: attempt blob deletions before `deleteMany`. Accept that the delete is best-effort but at least the rows survive to retry from.

### 5. `getPublicationJson` in `file-retrieval.ts` silently propagates parse errors — not tested for the non-JSON path

**File:** `/Users/junaid.iqbal/Documents/GitHub/cath-service/libs/publication/src/file-storage/file-retrieval.ts` line 26–29

```typescript
export async function getPublicationJson(artefactId: string): Promise<unknown | null> {
  const buffer = await getFileBuffer(artefactId);
  if (!buffer) return null;
  return JSON.parse(buffer.toString("utf-8"));  // throws on invalid JSON
}
```

The test at line 328 asserts that a `SyntaxError` is propagated, which is intentional per the existing spec. However, `getPublicationJson` is also called for flat-file artefacts (e.g. PDFs) where the buffer is valid but not JSON. This pre-dates the current ticket, but the change in how `getFileBuffer` resolves the blob name (now via `sourceArtefactId`) means that for a PDF flat file whose `sourceArtefactId` is `civil-daily-cause-list.pdf`, `getFileBuffer` would now correctly return the PDF bytes — and any caller of `getPublicationJson` on that artefact would throw. This is not a regression introduced here, but it is worth noting as a fragility that should be addressed.

### 6. `non-strategic-upload-summary` writes `uploadData.fileName` before conversion, then overwrites — the intermediate write is wasted

**File:** `/Users/junaid.iqbal/Documents/GitHub/cath-service/apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts` lines 123–145

```typescript
await saveUploadedFile(artefactId, uploadData.fileName, uploadData.file);
await updateSourceArtefactId(artefactId, uploadData.fileName);  // e.g. "report.xlsx"

// ... later in the same request ...
await saveUploadedFile(artefactId, `${artefactId}.json`, Buffer.from(...));
await updateSourceArtefactId(artefactId, `${artefactId}.json`); // overwrites
```

Two database writes happen when one would do. The initial `updateSourceArtefactId(artefactId, uploadData.fileName)` call for the Excel path is immediately superseded by `updateSourceArtefactId(artefactId, \`${artefactId}.json\`)`. This is not a bug — the final state is correct — but it is wasteful and the intermediate value (the `.xlsx` filename) is never persisted permanently, which contradicts the comment in the plan that says "The original Excel name is not preserved after conversion."

**Solution:** Only call `updateSourceArtefactId` after the conditional block, with the final decided value. This avoids the wasted write and makes the code's intent clearer.

---

## SUGGESTIONS

### 7. `sourceArtefactId` field should use `@db.VarChar(255)` rather than unbounded `TEXT`

**File:** `/Users/junaid.iqbal/Documents/GitHub/cath-service/libs/postgres-prisma/prisma/schema/base.prisma` line 26

```prisma
sourceArtefactId  String?  @map("source_artefact_id")
```

No length constraint is specified, so Prisma maps this to PostgreSQL `TEXT` (unlimited). File names should not exceed 255 characters (OS limit). The previous `file_extension` field used `@db.VarChar(10)`. Adding `@db.VarChar(255)` would prevent unexpectedly long values from being stored and makes the schema intent explicit.

### 8. `any` usage in test mocks could use `Pick<>` instead

**File:** `/Users/junaid.iqbal/Documents/GitHub/cath-service/libs/publication/src/file-storage/file-retrieval.test.ts` (multiple lines)

```typescript
vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ sourceArtefactId: "..." } as any);
```

The `as any` cast is a consequence of Prisma's generated type requiring all fields. A more type-safe pattern for partial mocks is:

```typescript
vi.mocked(prisma.artefact.findUnique).mockResolvedValue(
  { sourceArtefactId: "civil-daily-cause-list.pdf" } as Pick<Artefact, "sourceArtefactId"> as unknown as Artefact
);
```

This is low-priority (the pattern is common in test files throughout the repo), but worth noting given the strict TypeScript stance in CLAUDE.md.

### 9. Inline `path.extname` call in `flat-file-service.ts` could use the shared `getFileExtension` export

**File:** `/Users/junaid.iqbal/Documents/GitHub/cath-service/libs/public-pages/src/flat-file/flat-file-service.ts` line 78

```typescript
contentType: getContentType(path.extname(sourceArtefactId) || null),
```

The `getFileExtension` function in `@hmcts/publication` already encapsulates this derivation (including the `.pdf` fallback). Using it would reduce duplication, though the difference is minor given that `sourceArtefactId` is already resolved at this point.

### 10. Comments in `non-strategic-upload-summary/index.ts` describe implementation steps rather than intent

Several inline comments (lines 98, 102, 127, 130) describe what the code does rather than why. Per CLAUDE.md, comments should explain why, not what. For example:

```typescript
// Non-strategic publications should always have isFlatFile set to false
const isFlatFile = false;
```

This comment is accurate but redundant — the code is self-evident. The comment adds no information about the business reason (non-strategic publications are always stored as JSON). This is a minor style point.

---

## Positive Feedback

- The migration backfill logic (`artefact_id || COALESCE(file_extension, '.pdf')`) is correct. Existing blobs remain resolvable because blob names are `<uuid><ext>` and the backfilled `source_artefact_id` reproduces exactly this pattern, so `path.extname(sourceArtefactId)` returns the right extension.
- The null-safety fallback in `getSourceArtefactId` (`?? \`${artefactId}.pdf\``) correctly handles both NULL database values and the case where the artefact row does not exist, without throwing.
- The `deleteArtefacts` function correctly derives the extension from `sourceArtefactId` with a `.pdf` fallback for artefacts where it is NULL — matching the backfill behaviour.
- `updateSourceArtefactId` is a clean, single-purpose function with no superfluous parameters or logic.
- Test coverage on the new functions is thorough: `getSourceArtefactId`, `getFileExtension`, `getFileBuffer`, `getFileName`, `getPublicationJson`, `updateSourceArtefactId`, and `deleteArtefacts` are all exercised with realistic scenarios including null and missing-artefact paths.
- The `hearing-lists` controller correctly derives `isPdf` from `path.extname(result.sourceArtefactId || "")` — the `|| ""` guard prevents a crash when `sourceArtefactId` is an empty string.
- All tasks in `tasks.md` are checked off and the code matches the plan.
- All 52 test packages pass.

---

## Test Coverage Assessment

Unit tests are comprehensive for the core library changes. The gaps are:

| Gap | Severity |
|-----|----------|
| E2E test does not pass `sourceArtefactId` to the seeding endpoint, so the download filename assertion tests the fallback path rather than the new behaviour | HIGH |
| `UploadFlatFileInput` interface has no `sourceArtefactId` field — makes it impossible for E2E tests to exercise the happy path without a code change | HIGH |
| No unit test for the `non-strategic-upload-summary` POST handler verifying that the Excel→JSON conversion path ends with `sourceArtefactId = "${artefactId}.json"` rather than the original `.xlsx` name | MEDIUM |

---

## Acceptance Criteria Verification

- [x] Manual upload stores `source_artefact_id = <original file name>`: implemented in `manual-upload-summary/index.ts` line 115.
- [x] `/publication` API stores a source name (`upload.json`): implemented in `blob-ingestion/repository/service.ts` line 88.
- [x] `file_extension` column removed: migration drops it, schema removes the field, all code references replaced.
- [x] Existing artefacts continue to work after migration: backfill in migration.sql is correct.
- [ ] Flat file downloaded with the original name: the download route sets `Content-Disposition` from `getFileName(sourceArtefactId)` correctly, but the E2E test does not verify this for an artefact with a meaningful `sourceArtefactId` (see Critical Issue #1).

---

## Overall Assessment

**NEEDS CHANGES**

The implementation is functionally correct for new uploads and handles legacy data safely. The two critical issues that must be resolved before deployment are:

1. The E2E test does not exercise the actual new behaviour (the download filename) and the `UploadFlatFileInput` interface does not support `sourceArtefactId`, making it structurally impossible to write that test without a code change.
2. `saveUploadedFile` returns a `fileExtension` value that no caller uses — the function's return type should be `Promise<void>`.

The migration idempotency issue (High Priority #3) is strongly recommended given the precedent set by the previous migration on the same table.
