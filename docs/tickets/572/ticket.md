# #572: Store publication JSON and flat file uploads in Azure Blob Storage

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** junaidiqbalmoj
**Labels:** (none)
**Created:** 2026-05-12T11:07:15Z
**Updated:** 2026-06-22T16:04:31Z

## Description

## User Story

As a platform engineer, I want publication JSON payloads and flat file uploads (PDFs, CSVs, Excel) to be stored in Azure Blob Storage so that published court list data is durably persisted and not lost when a Kubernetes pod restarts or redeploys.
## Background

When a publication is ingested (via blob ingestion API or manual admin upload), the file is currently written to `storage/temp/uploads/` on the local pod filesystem. This is ephemeral — data is lost on every pod restart.

Two separate `saveUploadedFile()` implementations share this problem:
- `libs/api/src/blob-ingestion/file-storage.ts` — handles automated ingestion
- `libs/admin-pages/src/manual-upload/file-storage.ts` — handles manual admin uploads

File retrieval in `libs/publication/src/file-storage/file-retrieval.ts` scans the local directory listing to find files by artefact ID — this also breaks in a multi-pod deployment where pods have different local filesystems.

`pip-data-management` solves this with `AzureArtefactBlobService`, uploading to the `artefact` blob container keyed by UUID.

## Affected Files

| File | Current behaviour |
|------|-------------------|
| `libs/api/src/blob-ingestion/file-storage.ts` | `saveUploadedFile()` writes `{artefactId}{ext}` to `storage/temp/uploads/` |
| `libs/admin-pages/src/manual-upload/file-storage.ts` | Identical `saveUploadedFile()` writing to `storage/temp/uploads/` |
| `libs/publication/src/file-storage/file-retrieval.ts` | `findFileByArtefactId()` scans `fs.readdir()` on local filesystem; `getFileBuffer()` and `getFileExtension()` read from disk |

## Changes Required

- Replace `fs.writeFile()` in both `saveUploadedFile()` implementations with a blob upload to container `artefact`, blob key `{artefactId}{extension}`
- Update `file-retrieval.ts`:
  - Replace `fs.readdir()` + `fs.readFile()` in `findFileByArtefactId()` with `downloadBuffer()` from blob storage
  - Update `getFileExtension()` to derive the extension from the artefact database record or blob metadata (no longer relies on filesystem directory listing)
- Delete blob from the `artefact` container when an artefact is removed

## Acceptance Criteria

- [ ] Both `saveUploadedFile()` functions upload to Azure Blob Storage container `artefact`
- [ ] Blob key follows the pattern `{artefactId}{extension}` (e.g. `{uuid}.json`, `{uuid}.pdf`, `{uuid}.xlsx`)
- [ ] `getFileBuffer()` downloads from blob storage instead of reading from local filesystem
- [ ] `getFileExtension()` no longer depends on filesystem directory scanning
- [ ] Blob is deleted when the corresponding artefact record is deleted
- [ ] Works locally using the Azurite emulator (dev profile with shared key auth)
- [ ] Works in staging/production using managed identity auth (`MANAGED_IDENTITY_CLIENT_ID`)
- [ ] Unit tests cover: upload (JSON), upload (flat file), retrieval, deletion, and error cases

## Technical Notes

- Depends on the shared `libs/azure-blob` blob storage client (to be created as part of this or a prerequisite story — see issues #569 and #570 for infrastructure context)
- Container `artefact` is provisioned by `infrastructure/storage.tf` (issue #569)
- For PR/preview environments, the temporary ASO storage account provides the `artefact` container (issue #570)
- Note: `file-retrieval.ts` currently includes path traversal protection — this security logic is no longer needed once the filesystem is replaced with blob storage (blob keys are validated by the SDK)
- Reference: `pip-data-management` → `AzureArtefactBlobService`

## Comments

No comments on this issue.
