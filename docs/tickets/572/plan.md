# Plan: #572 — Store publication JSON and flat file uploads in Azure Blob Storage

## 1. Technical Approach

Replace all local filesystem reads and writes with Azure Blob Storage operations. The work has four parts:

1. Create a new `libs/azure-blob` library that owns the `BlobServiceClient` singleton, authentication strategy, and exposes typed upload/download/delete operations for the `artefact` container.
2. Replace `saveUploadedFile()` in `libs/api/src/blob-ingestion/file-storage.ts` and `libs/admin-pages/src/manual-upload/file-storage.ts` with calls to the new library.
3. Replace `findFileByArtefactId()` / `getFileBuffer()` / `getFileExtension()` in `libs/publication/src/file-storage/file-retrieval.ts` with blob download calls. `getFileExtension()` will derive the extension from the `artefact` DB record's `isFlatFile` flag and a new `fileExtension` field (see section 3).
4. Delete the corresponding blob when `deleteArtefacts()` removes artefact records from the DB.

The `getContentType()` and `getFileName()` utility functions in `file-retrieval.ts` have no filesystem access and are not changed.

---

## 2. `getFileExtension()` Resolution

The `Artefact` Prisma model (in `libs/postgres-prisma/prisma/schema/base.prisma`) does **not** have a `fileExtension` field. The current implementation discovers the extension by scanning the local directory.

After migration the blob key is `{artefactId}{extension}` (e.g. `cm5abc123.pdf`). The extension must come from a stored source. The chosen approach is:

**Add a `fileExtension` field to the `Artefact` Prisma model.**

- New field: `fileExtension String? @map("file_extension") @db.VarChar(10)`
- When `saveUploadedFile()` uploads a blob it also receives the extension. The callers of `saveUploadedFile()` already call `createArtefact()` / `updateArtefact()` shortly before or after; the save-file functions return the blob key. The extension must be persisted alongside the artefact record.
- `getFileExtension(artefactId)` then becomes a DB lookup: `prisma.artefact.findUnique({ where: { artefactId }, select: { fileExtension: true } })` and falls back to `".pdf"` when null.
- `getFileBuffer(artefactId)` uses `getFileExtension()` to construct the blob key before downloading.

This avoids blob metadata APIs (which require an additional SDK round-trip) and keeps the extension queryable from the DB.

**Migration required:** Add a new migration file in `libs/postgres-prisma/prisma/` to add the `file_extension` column to the `artefact` table (nullable, so existing rows are unaffected during rollout).

**Call-site update for `saveUploadedFile()`:** Both call sites must persist `fileExtension` on the artefact record. The blob-ingestion path (`libs/api/src/blob-ingestion/`) calls `createArtefact()` from `@hmcts/publication`; the manual-upload path calls the same. After uploading the blob the extension must be written via a new `updateArtefactFileExtension(artefactId, extension)` helper in `libs/publication/src/repository/queries.ts`, or by adding `fileExtension` to the `createArtefact` / `updateArtefact` data payload directly.

The cleanest option with minimal diff is to add `fileExtension` as an optional field to the `createArtefact` data and to update it when an artefact is superseded.

---

## 3. `libs/azure-blob` Library Structure

### Directory layout

```
libs/azure-blob/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts          # all exports
    └── blob-client.ts    # client factory + operations
```

No `config.ts` is needed because this library has no page routes or assets — it exports pure business logic only.

### Authentication strategy

```typescript
// libs/azure-blob/src/blob-client.ts
import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

const CONTAINER_NAME = "artefact";

function createBlobServiceClient(): BlobServiceClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (connectionString) {
    return BlobServiceClient.fromConnectionString(connectionString);
  }

  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  if (!accountName) {
    throw new Error("AZURE_STORAGE_ACCOUNT_NAME is required when AZURE_STORAGE_CONNECTION_STRING is not set");
  }

  const credential = new DefaultAzureCredential({
    managedIdentityClientId: process.env.MANAGED_IDENTITY_CLIENT_ID
  });
  return new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credential);
}
```

- Dev/local: Azurite via `AZURE_STORAGE_CONNECTION_STRING` (already in `.env.example`, docker-compose already runs Azurite on port 10000).
- Staging/prod: `DefaultAzureCredential` with `MANAGED_IDENTITY_CLIENT_ID` + `AZURE_STORAGE_ACCOUNT_NAME`.

The client is created lazily on first use (not at module load time) so tests can set environment variables before the first call.

### Exported functions

```typescript
// libs/azure-blob/src/index.ts

export async function uploadBlob(blobName: string, buffer: Buffer, contentType?: string): Promise<void>

export async function downloadBlob(blobName: string): Promise<Buffer | null>

export async function deleteBlob(blobName: string): Promise<void>
```

All three operate on the `artefact` container. The blob name is `{artefactId}{extension}` — callers are responsible for constructing the name.

`downloadBlob` returns `null` (not throws) when the blob does not exist (404), so callers can treat missing blobs the same as the current "file not found" behaviour.

`deleteBlob` swallows 404 (blob already gone) but rethrows other errors.

### `package.json`

```json
{
  "name": "@hmcts/azure-blob",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "production": "./dist/index.js",
      "default": "./src/index.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "format": "biome format --write .",
    "lint": "biome check .",
    "lint:fix": "biome check --write --unsafe ."
  },
  "dependencies": {
    "@azure/identity": "4.x",
    "@azure/storage-blob": "12.x"
  },
  "devDependencies": {
    "typescript": "6.0.3",
    "vitest": "4.1.9"
  }
}
```

`@azure/storage-blob` and `@azure/identity` are not currently in the root `package.json` — they must be added as workspace dependencies.

### `tsconfig.json`

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts", "dist", "node_modules"]
}
```

### Root `tsconfig.json` addition

```json
"@hmcts/azure-blob": ["libs/azure-blob/src"]
```

---

## 4. Files to Create / Modify

### Create

| File | Purpose |
|------|---------|
| `libs/azure-blob/package.json` | New library package |
| `libs/azure-blob/tsconfig.json` | TypeScript config |
| `libs/azure-blob/src/blob-client.ts` | Client factory and blob operations |
| `libs/azure-blob/src/index.ts` | Re-exports `uploadBlob`, `downloadBlob`, `deleteBlob` |
| `libs/azure-blob/src/blob-client.test.ts` | Unit tests |
| `libs/postgres-prisma/prisma/schema/artefact-storage.prisma` | New schema file adding `fileExtension` to `Artefact` — see note below |

Note on schema change: because `Artefact` is already defined in `base.prisma`, Prisma does not support splitting a single model across multiple files. The `fileExtension` field must be added directly to the `Artefact` model in `base.prisma`.

### Modify

| File | Change |
|------|--------|
| `libs/postgres-prisma/prisma/schema/base.prisma` | Add `fileExtension String? @map("file_extension") @db.VarChar(10)` to `Artefact` model |
| `libs/api/src/blob-ingestion/file-storage.ts` | Replace `fs.mkdir` + `fs.writeFile` with `uploadBlob()`; return blob name instead of file path |
| `libs/api/src/blob-ingestion/file-storage.test.ts` | Replace `fs` mocks with `@hmcts/azure-blob` mock |
| `libs/admin-pages/src/manual-upload/file-storage.ts` | Same replacement as above |
| `libs/admin-pages/src/manual-upload/file-storage.test.ts` | Replace integration test with unit test mocking `@hmcts/azure-blob` |
| `libs/publication/src/file-storage/file-retrieval.ts` | Replace `findFileByArtefactId()` (filesystem) with blob download + DB extension lookup; remove path traversal logic |
| `libs/publication/src/file-storage/file-retrieval.test.ts` | Replace `fs` mocks with `@hmcts/azure-blob` and `@hmcts/postgres-prisma` mocks |
| `libs/publication/src/repository/queries.ts` | Add `fileExtension` to `createArtefact` data payload; add `updateArtefactFileExtension()` helper; update `deleteArtefacts()` to also delete blobs |
| `libs/admin-pages/package.json` | Add `@hmcts/azure-blob: workspace:*` dependency |
| `libs/api/package.json` (blob-ingestion) | Add `@hmcts/azure-blob: workspace:*` dependency |
| `libs/publication/package.json` | Add `@hmcts/azure-blob: workspace:*` dependency |
| `tsconfig.json` (root) | Add `@hmcts/azure-blob` path |

---

## 5. Revised `file-retrieval.ts` Signatures

```typescript
// No longer needs findFileByArtefactId — it was only an internal helper

export async function getFileBuffer(artefactId: string): Promise<Buffer | null>
// Downloads blob using key `{artefactId}{extension}` where extension comes from DB lookup

export async function getFileExtension(artefactId: string): Promise<string>
// Queries prisma.artefact.findUnique for fileExtension; falls back to ".pdf"

export function getContentType(fileExtension: string | null | undefined): string
// Unchanged

export function getFileName(artefactId: string, fileExtension: string | null | undefined): string
// Unchanged
```

`findFileByArtefactId` is removed entirely as it has no callers outside the module and the blob approach does not need it.

---

## 6. Blob Deletion on Artefact Removal

`deleteArtefacts()` in `libs/publication/src/repository/queries.ts` currently only deletes DB rows. The call site (`apps/web/src/pages/(admin)/remove-list-confirmation/index.ts`) does not need to change.

`deleteArtefacts()` must:
1. Query the artefact IDs and their `fileExtension` values before deletion.
2. Delete the DB rows (existing behaviour).
3. Fire-and-forget blob deletions for each artefact, logging errors but not failing the DB deletion if a blob is missing.

Alternatively, blob deletion can be best-effort after the DB delete: if the blob delete fails the DB row is already gone and the blob will simply remain orphaned in storage. Given the ticket acceptance criteria says "blob is deleted when the corresponding artefact record is deleted", a best-effort approach (log errors, do not roll back DB) is acceptable and matches the existing pattern of fire-and-forget third-party deletion in the same call site.

---

## 7. Error Handling

| Scenario | Behaviour |
|----------|-----------|
| `uploadBlob()` fails | Propagate the error — callers already propagate upload errors (blob ingestion returns HTTP 500, manual upload shows error page) |
| `downloadBlob()` — blob not found (404) | Return `null` — same semantics as the current "file not found" path |
| `downloadBlob()` — other SDK error | Propagate; callers treat as server error |
| `deleteBlob()` — blob not found | Swallow silently (idempotent delete) |
| `deleteBlob()` — other error | Log and continue; do not fail the DB deletion |
| Missing env vars at startup | Throw descriptive error at first client creation, not at module load |

---

## 8. Acceptance Criteria Mapping

| Criterion | Implementation |
|-----------|---------------|
| Both `saveUploadedFile()` upload to container `artefact` | `uploadBlob()` in `libs/azure-blob`, called from both `file-storage.ts` files |
| Blob key `{artefactId}{extension}` | Constructed by `saveUploadedFile()` before calling `uploadBlob()` |
| `getFileBuffer()` downloads from blob storage | `downloadBlob()` using key from DB extension lookup |
| `getFileExtension()` no longer uses filesystem | DB query on `artefact.fileExtension` |
| Blob deleted when artefact is deleted | `deleteArtefacts()` calls `deleteBlob()` for each artefact |
| Works locally with Azurite | `AZURE_STORAGE_CONNECTION_STRING` branch in `createBlobServiceClient()` |
| Works in staging/prod with managed identity | `DefaultAzureCredential` branch |
| Unit tests for upload, retrieval, deletion, errors | `libs/azure-blob/src/blob-client.test.ts` + updated tests in consuming libs |

---

## 9. Open Questions / Clarifications Needed

1. **`saveUploadedFile()` return value**: Currently returns the local file path (a string). After migration the natural return is the blob name (`{artefactId}{extension}`). Check whether any caller uses the returned path for anything other than logging — if callers ignore the return value, the signature change is safe. If callers use it, the return type should change to `string` (blob name) with callers updated.

2. **`fileExtension` persistence — who calls `saveUploadedFile()` and when is `createArtefact()` called?** The blob-ingestion path in `libs/api/src/blob-ingestion/` calls `saveUploadedFile()` and `createArtefact()` as separate steps. The order and whether the `artefactId` is known before the file is saved needs confirming to ensure `fileExtension` can be written alongside the artefact row. If `createArtefact()` is called first (which is the typical pattern for generating the UUID), then `fileExtension` can be included in the create payload. If the file is saved first, an `updateArtefactFileExtension()` call is needed after.

3. **Existing blobs in Azurite for local dev**: The `artefact` container must exist in Azurite before use. `docker-compose up azurite` starts the emulator but does not pre-create containers. The lib's `uploadBlob()` should call `containerClient.createIfNotExists()` or the developer must run a one-time setup step. The plan is to call `createIfNotExists()` on first use (acceptable for dev; in prod the container is pre-provisioned by Terraform).

4. **`libs/admin-pages/src/manual-upload/file-storage.test.ts` is an integration test** (writes real files to disk). It must be replaced with a proper unit test mocking `@hmcts/azure-blob`. Confirm there is no CI step that depends on the integration test running against a real filesystem.

5. **`AZURE_STORAGE_CONNECTION_STRING` in root `.env`**: The `.env.example` in `apps/web` already has the Azurite connection string. The root `.env` does not. The developer setup instructions should note that `AZURE_STORAGE_CONNECTION_STRING` must be added to the root `.env` (or both app `.env` files) for local development.
