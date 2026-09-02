# #797: Update artefact table to store the file name (upload as manual upload or using /publication endpoint) in source_artefact_id column

**State:** OPEN
**Assignees:** junaidiqbalmoj
**Author:** junaidiqbalmoj
**Labels:** (none)
**Created:** 2026-07-01T14:26:19Z
**Updated:** 2026-07-07T11:55:30Z

## Description

Update artefact table to store the file name (upload as manual upload or using /publication endpoint) in source_artefact_id column.

- If user upload flat file using manual upload or api endpoint, and try to view that list in summary of publication page, file name should be same as uploaded (file name should be artefact ID as happening now)
- Once source_artefact_id column has been added, remove file_extension column from artefact table and make sure all functionality is working.

## Comments

### Comment by junaidiqbalmoj on 2026-07-07T11:48:11Z
@SPEC

### Comment by hmctsclaudecode on 2026-07-07T11:52:59Z
# Technical Specification — Issue #797

**Store the uploaded file name in `source_artefact_id` and remove `file_extension` from the artefact table**

## 1. User Story

**As a** publisher who uploads a flat file (through manual upload or the `/publication` API endpoint)
**I want to** have the file identified and downloaded using the same file name I uploaded
**So that** the publication is recognisable and the artefact record stores the original source file name instead of relying on a separate `file_extension` column.

## 2. Background

Flat files (PDF, DOCX, CSV, HTML, etc.) can enter the service in two ways:

- **Manual upload** — an admin uploads a file through the admin UI. Handled by `apps/web/src/pages/(admin)/manual-upload-summary/index.ts` (flat files) and `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts` (non-strategic lists).
- **`/publication` API endpoint** — `apps/api/src/routes/v1/publication.ts` → `libs/api/src/blob-ingestion/repository/service.ts` (`processBlobIngestion`).

Today the artefact record only stores the file *extension* in the `file_extension` column (added in migration `20260623000000_add_file_extension_to_artefact`). The original file name is never persisted. As a result:

- Blobs are stored as `<artefactId><extension>` (e.g. `a1b2…-c3d4.pdf`).
- When a user views/downloads a flat file, the download name is the artefact UUID plus extension (`libs/publication/src/file-storage/file-retrieval.ts` → `getFileName`), not the name the publisher uploaded.

This change replaces `file_extension` with a `source_artefact_id` column that stores the full uploaded file name. The file extension is derived from that name where needed, so `file_extension` becomes redundant and is removed.

Relevant existing code:

- Schema: `libs/postgres-prisma/prisma/schema/base.prisma` (`model Artefact`, line 26 `fileExtension`)
- Read/derive extension + build blob/file names: `libs/publication/src/file-storage/file-retrieval.ts`
- Persist extension + blob deletion: `libs/publication/src/repository/queries.ts` (`updateArtefactFileExtension`, `deleteArtefacts`)
- Upload flows: `manual-upload-summary/index.ts`, `non-strategic-upload-summary/index.ts`, `blob-ingestion/repository/service.ts`
- Flat-file display/download: `libs/public-pages/src/flat-file/flat-file-service.ts`, `libs/public-pages/src/routes/api/flat-file/[artefactId]/download.ts`, `apps/web/src/pages/(public)/hearing-lists/[locationId]/[artefactId]/index.ts`

> Note: this is primarily a data-model and backend refactor. Its only user-visible effect is the file name shown when a flat file is downloaded. There is no new page and no new form.

## 3. Acceptance Criteria

* **Scenario:** Flat file uploaded via manual upload keeps its file name
    * **Given** an admin uploads a flat file named `civil-daily-cause-list.pdf` through manual upload
    * **When** the artefact record is created
    * **Then** `source_artefact_id` is set to `civil-daily-cause-list.pdf` and the blob is stored using the extension derived from that name

* **Scenario:** Flat file downloaded with the original name
    * **Given** a published flat file whose `source_artefact_id` is `civil-daily-cause-list.pdf`
    * **When** a user views the publication from the summary of publications page and downloads it
    * **Then** the downloaded file is named `civil-daily-cause-list.pdf` (not the artefact UUID) and the `Content-Type` matches the file extension

* **Scenario:** Publication ingested via `/publication` endpoint stores a source name
    * **Given** a JSON publication is ingested through the `/publication` API endpoint
    * **When** the artefact record is created
    * **Then** `source_artefact_id` is populated with a value whose extension resolves the stored blob (`.json`)

* **Scenario:** `file_extension` column removed
    * **Given** the migration has been applied
    * **When** the artefact table is inspected
    * **Then** the `file_extension` column no longer exists and all read, display, download and delete flows work using `source_artefact_id`

* **Scenario:** Existing artefacts continue to work after migration
    * **Given** artefacts created before this change (which have `file_extension` but no `source_artefact_id`)
    * **When** the migration runs
    * **Then** `source_artefact_id` is backfilled so those files can still be resolved, downloaded and deleted

## 4. User Journey Flow

```
┌──────────────────────┐     ┌──────────────────────┐
│  Manual upload (UI)  │     │  /publication (API)  │
└──────────┬───────────┘     └──────────┬───────────┘
           │ file name + buffer          │ JSON payload
           ▼                              ▼
   saveUploadedFile()             saveUploadedFile()
   blob = <id><ext>               blob = <id>.json
           │                              │
           ▼                              ▼
   createArtefact({ …, sourceArtefactId: <original file name> })
           │
           ▼
   artefact row: source_artefact_id = "civil-daily-cause-list.pdf"
           │
           ▼
   Summary of publications page  ── user selects a publication
           │
           ▼
   Flat file view / download
     • extension derived from source_artefact_id
     • download name = source_artefact_id  (was: <artefactId><ext>)
```

## 5. Database Schema Change

**`libs/postgres-prisma/prisma/schema/base.prisma`** (`model Artefact`):

```prisma
model Artefact {
  artefactId        String            @id @default(uuid()) @map("artefact_id") @db.Uuid
  ...
  noMatch           Boolean           @default(false) @map("no_match")
  sourceArtefactId  String?           @map("source_artefact_id")   // NEW — stores the uploaded file name
  // fileExtension  String?           @map("file_extension")       // REMOVED
  ...
  @@map("artefact")
}
```

**Migration SQL:**

```sql
-- Add new column
ALTER TABLE "artefact" ADD COLUMN "source_artefact_id" TEXT;

-- Backfill existing rows so blobs remain resolvable and downloads keep a sensible name.
UPDATE "artefact"
SET "source_artefact_id" = "artefact_id" || COALESCE("file_extension", '.pdf')
WHERE "source_artefact_id" IS NULL;

-- Remove the now-redundant column
ALTER TABLE "artefact" DROP COLUMN "file_extension";
```

## 6. Assumptions & Open Questions

* **Interpretation of the issue wording.** The issue says "file name should be same as uploaded (file name should be artefact ID as happening now)". This is read as: *currently the download name is the artefact ID; it should become the original uploaded file name.* Please confirm this is the intended behaviour rather than keeping the artefact-ID name.
* **`source_artefact_id` semantics vs. blob resolution.** For flat files there is no conversion, so the original name's extension equals the stored blob's extension. For non-strategic Excel→JSON conversions the authoritative blob is `<id>.json`; the spec stores a `source_artefact_id` whose extension is `.json` so blob resolution stays correct. Confirm whether, for converted files, the *display* name should be the original `.xlsx` name.
* **`/publication` API has no file name.** JSON ingestion has no uploaded file name. The spec uses `upload.json` (matching current blob naming). Should the API payload gain an explicit source file-name field instead?
* **Legacy backfill naming.** Pre-existing rows have no original name; they are backfilled to `<artefactId><file_extension>`, so downloads of old publications keep the UUID-based name. Acceptable?
* **`test-support` seed route.** `libs/test-support/src/routes/test-support/flat-files.ts` seeds blobs using an `extension` query param and does not touch `file_extension`; it should now also set `source_artefact_id` for seeded artefacts used in E2E flat-file tests.
