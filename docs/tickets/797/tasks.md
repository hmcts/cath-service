# Implementation Tasks

## Database & Schema

- [x] Add `sourceArtefactId String? @map("source_artefact_id")` to `model Artefact` in `libs/postgres-prisma/prisma/schema/base.prisma` and remove `fileExtension` field
- [x] Create migration file `apps/postgres/prisma/migrations/<timestamp>_replace_file_extension_with_source_artefact_id/migration.sql` with: add column, backfill from `file_extension || uuid`, drop `file_extension`
- [x] Run `yarn db:generate` to regenerate the Prisma client

## Core Library — `libs/publication`

- [x] In `libs/publication/src/repository/queries.ts`: rename `updateArtefactFileExtension` to `updateSourceArtefactId` (parameter changes from `fileExtension: string` to `sourceArtefactId: string`; update the Prisma field written)
- [x] In `libs/publication/src/repository/queries.ts`: update `deleteArtefacts` to select `sourceArtefactId` instead of `fileExtension` and derive the blob extension via `path.extname(sourceArtefactId)`
- [x] In `libs/publication/src/file-storage/file-retrieval.ts`: update `getFileExtension` to query `sourceArtefactId` and return `path.extname(sourceArtefactId) || ".pdf"`
- [x] In `libs/publication/src/file-storage/file-retrieval.ts`: update `getFileBuffer` to derive extension from `sourceArtefactId`
- [x] In `libs/publication/src/file-storage/file-retrieval.ts`: update `getFileName` to accept a `sourceArtefactId: string` parameter and return it directly (removing the `artefactId` parameter)
- [x] In `libs/publication/src/index.ts`: replace `updateArtefactFileExtension` export with `updateSourceArtefactId`

## Upload Flows

- [x] In `apps/web/src/pages/(admin)/manual-upload-summary/index.ts`: replace `updateArtefactFileExtension(artefactId, fileExtension)` call with `updateSourceArtefactId(artefactId, uploadData.fileName)` (drop unused `fileExtension` variable from `saveUploadedFile` return)
- [x] In `apps/web/src/pages/(admin)/non-strategic-upload-summary/index.ts`: same replacement for the JSON/flat-file path; for the Excel→JSON conversion path, call `updateSourceArtefactId(artefactId, \`${artefactId}.json\`)` after saving the converted blob

## API Ingestion

- [x] In `libs/api/src/blob-ingestion/repository/service.ts`: replace `updateArtefactFileExtension(artefactId, fileExtension)` with `updateSourceArtefactId(artefactId, "upload.json")` (drop unused `fileExtension` variable)

## Public Download Flow

- [x] In `libs/public-pages/src/flat-file/flat-file-service.ts`: update `getFlatFileForDisplay` to query/return `sourceArtefactId` instead of `fileExtension`
- [x] In `libs/public-pages/src/flat-file/flat-file-service.ts`: update `getFileForDownload` to use `getFileName(sourceArtefactId)` (new single-argument signature) for the `fileName` field
- [x] In `apps/web/src/pages/(public)/hearing-lists/[locationId]/[artefactId]/index.ts`: update any reference to `fileExtension` from the flat-file service result to use `sourceArtefactId` for the PDF type check (derive extension via `path.extname`)

## Test Support

- [x] In `libs/test-support/src/routes/test-support/flat-files.ts`: update the POST handler to accept an optional `sourceArtefactId` body field and call `updateSourceArtefactId` on the seeded artefact row

## Tests

- [x] Update `libs/publication/src/file-storage/file-retrieval.test.ts`: replace `fileExtension` mock data with `sourceArtefactId`; update assertions for `getFileExtension`, `getFileBuffer`, and `getFileName` to match new behaviour
- [x] Update `libs/publication/src/repository/queries.test.ts`: replace `fileExtension` mock data in `deleteArtefacts` tests with `sourceArtefactId`; add/update test for `updateSourceArtefactId` (was `updateArtefactFileExtension`)
- [x] Run `yarn test` and fix any remaining test failures caused by the refactor
